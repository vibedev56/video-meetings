import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MeetingDetailResult,
  toMeetingDetailResult,
} from '../meeting.result.js';
import { GetMeetingQuery } from './get-meeting.query.js';

@QueryHandler(GetMeetingQuery)
export class GetMeetingHandler implements IQueryHandler<
  GetMeetingQuery,
  MeetingDetailResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeetingQuery): Promise<MeetingDetailResult> {
    // Filtering by owner means another user's meeting looks the same as a
    // missing one, so ids of other users' meetings are not revealed.
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: query.meetingId, ownerId: query.ownerId },
      include: { tasks: { orderBy: { createdAt: 'asc' } } },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return toMeetingDetailResult(meeting);
  }
}
