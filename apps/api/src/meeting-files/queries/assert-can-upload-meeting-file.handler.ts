import { ConflictException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { canUploadMoreFiles } from '../meeting-file.policy.js';
import { AssertCanUploadMeetingFileQuery } from './assert-can-upload-meeting-file.query.js';

@QueryHandler(AssertCanUploadMeetingFileQuery)
export class AssertCanUploadMeetingFileHandler implements IQueryHandler<
  AssertCanUploadMeetingFileQuery,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: AssertCanUploadMeetingFileQuery): Promise<void> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: query.meetingId, ownerId: query.ownerId },
      select: { id: true },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const count = await this.prisma.meetingFile.count({
      where: { meetingId: query.meetingId },
    });

    if (!canUploadMoreFiles(count)) {
      throw new ConflictException('Meeting already has the maximum files');
    }
  }
}
