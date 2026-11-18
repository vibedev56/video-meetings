import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { stat } from 'node:fs/promises';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MeetingFileDownloadResult } from '../meeting-file.result.js';
import { MeetingFileStorage } from '../meeting-file.storage.js';
import { GetMeetingFileQuery } from './get-meeting-file.query.js';

@QueryHandler(GetMeetingFileQuery)
export class GetMeetingFileHandler implements IQueryHandler<
  GetMeetingFileQuery,
  MeetingFileDownloadResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MeetingFileStorage,
  ) {}

  async execute(
    query: GetMeetingFileQuery,
  ): Promise<MeetingFileDownloadResult> {
    // The owner filter goes through the meeting, so a foreign meeting and a
    // missing file both give the same 404.
    const file = await this.prisma.meetingFile.findFirst({
      where: {
        id: query.fileId,
        meetingId: query.meetingId,
        meeting: { ownerId: query.ownerId },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const path = this.storage.pathFor(file.storedName);

    // A row whose bytes are gone is treated as missing, not as a server error.
    try {
      await stat(path);
    } catch {
      throw new NotFoundException('File not found');
    }

    return {
      path,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
    };
  }
}
