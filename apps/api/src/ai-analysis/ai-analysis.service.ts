import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiProcessingStatus } from '../meetings/meeting-ai-status.js';
import { MeetingsService } from '../meetings/meetings.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TranscriptionStatus } from '../transcriptions/transcription-status.js';
import { AI_AGENT_RUNNER, type AiAgentRunner } from './ai-agent.runner.js';
import {
  AI_FAILURE_MESSAGE,
  AI_RETRY_DELAY_MS,
  AI_TRANSCRIPT_TRUNCATED_NOTE,
  MAX_AI_ATTEMPTS,
  MAX_TRANSCRIPT_CHARS,
  RETRY_CHUNK_SCALE,
} from './ai-analysis.constants.js';
import { AiRuntimeUnavailableError } from './ai-analysis.errors.js';

interface LoadedTranscript {
  text: string;
  /** Characters beyond MAX_TRANSCRIPT_CHARS that were not sent to the model. */
  droppedChars: number;
}

interface RunOutcome {
  succeeded: boolean;
  droppedChars: number;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  /** Tail of the run chain per meeting, so runs of one meeting never overlap. */
  private readonly chains = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
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

    await this.meetings.markAiStatus(meetingId, AiProcessingStatus.IN_PROGRESS);
    try {
      const { succeeded, droppedChars } = await this.runWithRetry(
        meetingId,
        ownerId,
      );
      await this.meetings.markAiStatus(
        meetingId,
        succeeded ? AiProcessingStatus.DONE : AiProcessingStatus.FAILED,
        succeeded
          ? this.truncationNote(meetingId, droppedChars)
          : AI_FAILURE_MESSAGE,
      );
    } catch (error) {
      if (error instanceof AiRuntimeUnavailableError) {
        // The local model is down or not pulled: back to PENDING with a hint.
        this.logger.warn(`AI skipped for ${meetingId}: ${error.message}`);
        await this.meetings.markAiSkipped(meetingId, error.message);
        return;
      }
      this.logger.error(`AI run failed for ${meetingId}: ${String(error)}`);
      await this.meetings.markAiStatus(
        meetingId,
        AiProcessingStatus.FAILED,
        AI_FAILURE_MESSAGE,
      );
    }
  }

  /** A DONE run that skipped the transcript tail is not silent: warn in the log and in aiError. */
  private truncationNote(meetingId: string, droppedChars: number) {
    if (droppedChars === 0) return null;
    this.logger.warn(
      `Transcript of ${meetingId} exceeds ${MAX_TRANSCRIPT_CHARS} chars: ${droppedChars} chars were not analyzed`,
    );
    return AI_TRANSCRIPT_TRUNCATED_NOTE;
  }

  /**
   * Retries on an exception (timeout, truncated output) or an invalid answer.
   * A retry is never identical: every attempt shrinks the chunk size. An
   * unavailable runtime is not retried: it is rethrown to `process`.
   */
  private async runWithRetry(
    meetingId: string,
    ownerId: string,
  ): Promise<RunOutcome> {
    let droppedChars = 0;
    for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
      try {
        const meeting = await this.meetings.findOwnedForAi(meetingId, ownerId);
        const transcript = await this.loadTranscript(meetingId);
        if (!meeting || !transcript.text) {
          return { succeeded: false, droppedChars };
        }
        droppedChars = transcript.droppedChars;

        const result = await this.runner.run({
          meetingId,
          ownerId,
          transcript: transcript.text,
          summary: meeting.summary,
          decisions: meeting.decisions,
          chunkScale: RETRY_CHUNK_SCALE ** (attempt - 1),
        });
        if (result.meetingUpdated) return { succeeded: true, droppedChars };
        this.logger.warn(`Attempt ${attempt}: model stored no result`);
      } catch (error) {
        if (error instanceof AiRuntimeUnavailableError) throw error;
        this.logger.warn(`Attempt ${attempt} failed: ${String(error)}`);
      }
      if (attempt < MAX_AI_ATTEMPTS) await delay(AI_RETRY_DELAY_MS * attempt);
    }
    return { succeeded: false, droppedChars };
  }

  /** Transcripts of all completed files of the meeting, oldest first. */
  private async loadTranscript(meetingId: string): Promise<LoadedTranscript> {
    const rows = await this.prisma.transcription.findMany({
      where: {
        status: TranscriptionStatus.COMPLETED,
        meetingFile: { meetingId },
      },
      orderBy: { finishedAt: 'asc' },
      select: { text: true, meetingFile: { select: { originalName: true } } },
    });
    const full = rows
      .filter((row) => row.text?.trim())
      .map((row) => `[${row.meetingFile.originalName}]\n${row.text}`)
      .join('\n\n');
    return {
      text: full.slice(0, MAX_TRANSCRIPT_CHARS),
      droppedChars: Math.max(0, full.length - MAX_TRANSCRIPT_CHARS),
    };
  }
}
