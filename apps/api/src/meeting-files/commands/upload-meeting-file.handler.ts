import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { rm } from 'node:fs/promises';
import type { MeetingFile } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MeetingFileUploadedEvent } from '../events/meeting-file-uploaded.event.js';
import { canUploadMoreFiles } from '../meeting-file.policy.js';
import { isTranscribableFile } from '../transcribable-file.policy.js';
import {
  MeetingFileResult,
  type TranscriptionSummaryResult,
  toMeetingFileResult,
} from '../meeting-file.result.js';
import { UploadMeetingFileCommand } from './upload-meeting-file.command.js';

@CommandHandler(UploadMeetingFileCommand)
export class UploadMeetingFileHandler implements ICommandHandler<
  UploadMeetingFileCommand,
  MeetingFileResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UploadMeetingFileCommand): Promise<MeetingFileResult> {
    let file: MeetingFile & {
      transcription: TranscriptionSummaryResult | null;
    };
    try {
      file = await this.prisma.$transaction(async (tx) => {
        // Locking the meeting row serializes concurrent uploads, so two
        // requests cannot both pass the count check for the last free slot.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM meetings
          WHERE id = ${command.meetingId} AND "ownerId" = ${command.ownerId}
          FOR UPDATE`;

        if (locked.length === 0) {
          throw new NotFoundException('Meeting not found');
        }

        const count = await tx.meetingFile.count({
          where: { meetingId: command.meetingId },
        });

        if (!canUploadMoreFiles(count)) {
          throw new ConflictException('Meeting already has the maximum files');
        }

        // The transcription row is created with the file, so a crash after
        // the commit cannot leave a transcribable file without one.
        return tx.meetingFile.create({
          data: {
            meetingId: command.meetingId,
            originalName: command.originalName,
            storedName: command.storedName,
            sizeBytes: command.sizeBytes,
            mimeType: command.mimeType,
            ...(isTranscribableFile(command.originalName)
              ? { transcription: { create: {} } }
              : {}),
          },
          include: {
            transcription: { select: { status: true, error: true } },
          },
        });
      });
    } catch (error) {
      // The file is already on disk, so a rejected upload must remove it.
      await rm(command.filePath, { force: true }).catch(() => undefined);
      throw error;
    }

    // Published after the commit, so handlers always find the committed row.
    this.eventBus.publish(
      new MeetingFileUploadedEvent(file.id, file.meetingId, file.originalName),
    );

    return toMeetingFileResult(file, file.transcription);
  }
}
