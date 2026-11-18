import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { rm } from 'node:fs/promises';
import { PrismaService } from '../../prisma/prisma.service.js';
import { canUploadMoreFiles } from '../meeting-file.policy.js';
import {
  MeetingFileResult,
  toMeetingFileResult,
} from '../meeting-file.result.js';
import { UploadMeetingFileCommand } from './upload-meeting-file.command.js';

@CommandHandler(UploadMeetingFileCommand)
export class UploadMeetingFileHandler implements ICommandHandler<
  UploadMeetingFileCommand,
  MeetingFileResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UploadMeetingFileCommand): Promise<MeetingFileResult> {
    try {
      const file = await this.prisma.$transaction(async (tx) => {
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

        return tx.meetingFile.create({
          data: {
            meetingId: command.meetingId,
            originalName: command.originalName,
            storedName: command.storedName,
            sizeBytes: command.sizeBytes,
            mimeType: command.mimeType,
          },
        });
      });

      return toMeetingFileResult(file);
    } catch (error) {
      // The file is already on disk, so a rejected upload must remove it.
      await rm(command.filePath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
