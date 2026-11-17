import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MeetingResult, toMeetingResult } from '../meeting.result.js';
import { GetMeetingQuery } from './get-meeting.query.js';

@QueryHandler(GetMeetingQuery)
export class GetMeetingHandler implements IQueryHandler<
  GetMeetingQuery,
  MeetingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeetingQuery): Promise<MeetingResult> {
    // Filtering by owner means another user's meeting looks the same as a
    // missing one, so ids of other users' meetings are not revealed.
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: query.meetingId, ownerId: query.ownerId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return toMeetingResult(meeting);
  }
}
