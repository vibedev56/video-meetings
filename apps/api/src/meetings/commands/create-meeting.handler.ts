import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MeetingResult, toMeetingResult } from '../meeting.result.js';
import { CreateMeetingCommand } from './create-meeting.command.js';

@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<
  CreateMeetingCommand,
  MeetingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateMeetingCommand): Promise<MeetingResult> {
    const meeting = await this.prisma.meeting.create({
      data: {
        title: command.title,
        date: command.date,
        participants: command.participants,
        ownerId: command.ownerId,
      },
    });

    return toMeetingResult(meeting);
  }
}
