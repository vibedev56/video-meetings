import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GetTranscriptionQuery } from './queries/get-transcription.query.js';
import type { TranscriptionResult } from './transcription-status.js';

@Controller('meetings/:id/files/:fileId/transcription')
@UseGuards(JwtAuthGuard)
export class TranscriptionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  get(
    @CurrentUser() user: AuthUser,
    @Param('id') meetingId: string,
    @Param('fileId') fileId: string,
  ): Promise<TranscriptionResult> {
    return this.queryBus.execute(
      new GetTranscriptionQuery(user.id, meetingId, fileId),
    );
  }
}
