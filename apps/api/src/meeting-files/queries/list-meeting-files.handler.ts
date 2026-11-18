import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MeetingFileResult,
  toMeetingFileResult,
} from '../meeting-file.result.js';
import { ListMeetingFilesQuery } from './list-meeting-files.query.js';

@QueryHandler(ListMeetingFilesQuery)
export class ListMeetingFilesHandler implements IQueryHandler<
  ListMeetingFilesQuery,
  MeetingFileResult[]
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListMeetingFilesQuery): Promise<MeetingFileResult[]> {
    // The owner filter makes another user's meeting look the same as a
    // missing one, so it gets 404 rather than an empty list.
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: query.meetingId, ownerId: query.ownerId },
      select: { files: { orderBy: { uploadedAt: 'asc' } } },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting.files.map(toMeetingFileResult);
  }
}
