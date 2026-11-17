import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateMeetingCommand } from './commands/create-meeting.command.js';
import { CreateMeetingDto } from './dto/create-meeting.dto.js';
import type { MeetingResult } from './meeting.result.js';
import { GetMeetingQuery } from './queries/get-meeting.query.js';
import { ListMeetingsQuery } from './queries/list-meetings.query.js';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMeetingDto,
  ): Promise<MeetingResult> {
    return this.commandBus.execute(
      new CreateMeetingCommand(
        user.id,
        dto.title,
        new Date(dto.date),
        dto.participants,
      ),
    );
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<MeetingResult[]> {
    return this.queryBus.execute(new ListMeetingsQuery(user.id));
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<MeetingResult> {
    return this.queryBus.execute(new GetMeetingQuery(user.id, id));
  }
}
