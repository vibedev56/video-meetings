import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { basename, join } from 'node:path';
import { getMeetingFilesDir } from '../../meeting-files/meeting-files.config.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TranscriptionStatus } from '../transcription-status.js';
import {
  GENERIC_FAILURE_MESSAGE,
  TRANSCRIPTION_RUNNER,
  TranscriptionFailedError,
  TranscriptionInterruptedError,
  type TranscriptionRunner,
} from '../transcription.runner.js';
import { ProcessTranscriptionCommand } from './process-transcription.command.js';

const MAX_STATUS_WRITE_ATTEMPTS = 3;
const STATUS_WRITE_RETRY_DELAY_MS = 500;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface StatusFields {
  text?: string;
  error?: string | null;
  startedAt?: Date;
  finishedAt?: Date;
}

@CommandHandler(ProcessTranscriptionCommand)
export class ProcessTranscriptionHandler implements ICommandHandler<
  ProcessTranscriptionCommand,
  void
> {
  private readonly logger = new Logger(ProcessTranscriptionHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(TRANSCRIPTION_RUNNER) private readonly runner: TranscriptionRunner,
  ) {}

  async execute(command: ProcessTranscriptionCommand): Promise<void> {
    const { meetingFileId } = command;
    const file = await this.prisma.meetingFile.findUnique({
      where: { id: meetingFileId },
      select: { storedName: true },
    });

    // The file (and its cascaded row) may be gone while the job waited.
    if (!file) return;

    await this.markStatus(meetingFileId, TranscriptionStatus.PROCESSING, {
      startedAt: new Date(),
      error: null,
    });

    const path = join(
      getMeetingFilesDir(this.config),
      basename(file.storedName),
    );
    try {
      const text = await this.runner.run(path);
      await this.markStatus(meetingFileId, TranscriptionStatus.COMPLETED, {
        text,
        error: null,
        finishedAt: new Date(),
      });
    } catch (error) {
      // Left as PROCESSING: the next boot re-queues it.
      if (error instanceof TranscriptionInterruptedError) return;
      await this.markStatus(meetingFileId, TranscriptionStatus.FAILED, {
        error: this.toSafeMessage(error),
        finishedAt: new Date(),
      });
    }
  }

  private toSafeMessage(error: unknown): string {
    if (error instanceof TranscriptionFailedError) return error.message;

    this.logger.error(`Unexpected transcription error: ${String(error)}`);
    return GENERIC_FAILURE_MESSAGE;
  }

  /** Retries transient DB errors. updateMany: a row removed with its file is not an error. */
  private async markStatus(
    meetingFileId: string,
    status: TranscriptionStatus,
    fields: StatusFields,
  ): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.prisma.transcription.updateMany({
          where: { meetingFileId },
          data: { status, ...fields },
        });
        return;
      } catch (error) {
        if (attempt >= MAX_STATUS_WRITE_ATTEMPTS) throw error;
        this.logger.warn(`Status write failed, retrying: ${String(error)}`);
        await delay(STATUS_WRITE_RETRY_DELAY_MS * attempt);
      }
    }
  }
}
