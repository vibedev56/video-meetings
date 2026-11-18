import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MeetingResult, toMeetingResult } from '../meeting.result.js';
import { ListMeetingsQuery } from './list-meetings.query.js';

@QueryHandler(ListMeetingsQuery)
export class ListMeetingsHandler implements IQueryHandler<
  ListMeetingsQuery,
  MeetingResult[]
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListMeetingsQuery): Promise<MeetingResult[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: { ownerId: query.ownerId },
      orderBy: { date: 'asc' },
    });

    return meetings.map(toMeetingResult);
  }
}
