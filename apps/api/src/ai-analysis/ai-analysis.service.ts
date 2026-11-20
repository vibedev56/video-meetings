import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProcessingStatus } from '../meetings/meeting-ai-status.js';
import { MeetingsService } from '../meetings/meetings.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TranscriptionStatus } from '../transcriptions/transcription-status.js';
import { AI_AGENT_RUNNER, type AiAgentRunner } from './ai-agent.runner.js';
import { getAiAnalysisConfig, isAiConfigured } from './ai-analysis.config.js';
import {
  AI_FAILURE_MESSAGE,
  AI_NOT_CONFIGURED_MESSAGE,
  AI_RETRY_DELAY_MS,
  MAX_AI_ATTEMPTS,
  MAX_TRANSCRIPT_CHARS,
} from './ai-analysis.constants.js';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  /** Tail of the run chain per meeting, so runs of one meeting never overlap. */
  private readonly chains = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly meetings: MeetingsService,
    @Inject(AI_AGENT_RUNNER) private readonly runner: AiAgentRunner,
  ) {}

  /** Fire-and-forget entry point: never rejects, failures end as FAILED. */
  start(meetingId: string): void {
    const previous = this.chains.get(meetingId) ?? Promise.resolve();
    const next = previous
      .then(() => this.process(meetingId))
      .catch((error) =>
        this.logger.error(`AI run crashed for ${meetingId}: ${String(error)}`),
      )
      .finally(() => {
        if (this.chains.get(meetingId) === next) this.chains.delete(meetingId);
      });
    this.chains.set(meetingId, next);
  }

  /** Waits for the queued runs of a meeting (used by tests). */
  async idle(meetingId: string): Promise<void> {
    await this.chains.get(meetingId);
  }

  /** PENDING -> IN_PROGRESS -> DONE or FAILED. */
  async process(meetingId: string): Promise<void> {
    const ownerId = await this.meetings.getOwnerId(meetingId);
    if (!ownerId) return;

    if (!isAiConfigured(getAiAnalysisConfig(this.config))) {
      await this.meetings.markAiSkipped(meetingId, AI_NOT_CONFIGURED_MESSAGE);
      return;
    }

    await this.meetings.markAiStatus(meetingId, AiProcessingStatus.IN_PROGRESS);
    try {
      const succeeded = await this.runWithRetry(meetingId, ownerId);
      await this.meetings.markAiStatus(
        meetingId,
        succeeded ? AiProcessingStatus.DONE : AiProcessingStatus.FAILED,
        succeeded ? null : AI_FAILURE_MESSAGE,
      );
    } catch (error) {
      this.logger.error(`AI run failed for ${meetingId}: ${String(error)}`);
      await this.meetings.markAiStatus(
        meetingId,
        AiProcessingStatus.FAILED,
        AI_FAILURE_MESSAGE,
      );
    }
  }

  /** Retries on an exception or an invalid answer (no result stored). */
  private async runWithRetry(
    meetingId: string,
    ownerId: string,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
      try {
        const meeting = await this.meetings.findOwnedForAi(meetingId, ownerId);
        const transcript = await this.loadTranscript(meetingId);
        if (!meeting || !transcript) return false;

        const result = await this.runner.run({
          meetingId,
          ownerId,
          transcript,
          summary: meeting.summary,
          decisions: meeting.decisions,
        });
        if (result.meetingUpdated) return true;
        this.logger.warn(`Attempt ${attempt}: agent stored no result`);
      } catch (error) {
        this.logger.warn(`Attempt ${attempt} failed: ${String(error)}`);
      }
      if (attempt < MAX_AI_ATTEMPTS) await delay(AI_RETRY_DELAY_MS * attempt);
    }
    return false;
  }

  /** Transcripts of all completed files of the meeting, oldest first. */
  private async loadTranscript(meetingId: string): Promise<string> {
    const rows = await this.prisma.transcription.findMany({
      where: {
        status: TranscriptionStatus.COMPLETED,
        meetingFile: { meetingId },
      },
      orderBy: { finishedAt: 'asc' },
      select: { text: true, meetingFile: { select: { originalName: true } } },
    });
    return rows
      .filter((row) => row.text?.trim())
      .map((row) => `[${row.meetingFile.originalName}]\n${row.text}`)
      .join('\n\n')
      .slice(0, MAX_TRANSCRIPT_CHARS);
  }
}
