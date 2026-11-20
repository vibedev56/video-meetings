import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { TranscriptionResult } from '../transcription-status.js';
import { GetTranscriptionQuery } from './get-transcription.query.js';

@QueryHandler(GetTranscriptionQuery)
export class GetTranscriptionHandler implements IQueryHandler<
  GetTranscriptionQuery,
  TranscriptionResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTranscriptionQuery): Promise<TranscriptionResult> {
    // The owner filter goes through the meeting, so a foreign file, a missing
    // file and a file without a transcription all give the same 404.
    const transcription = await this.prisma.transcription.findFirst({
      where: {
        meetingFileId: query.fileId,
        meetingFile: {
          meetingId: query.meetingId,
          meeting: { ownerId: query.ownerId },
        },
      },
      select: { status: true, text: true, error: true },
    });

    if (!transcription) {
      throw new NotFoundException('Transcription not found');
    }

    return transcription;
  }
}
