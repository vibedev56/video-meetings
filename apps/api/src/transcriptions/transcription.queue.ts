import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ProcessTranscriptionCommand } from './commands/process-transcription.command.js';

/** In-process FIFO queue with concurrency 1; never blocks the caller. */
@Injectable()
export class TranscriptionQueue {
  private readonly logger = new Logger(TranscriptionQueue.name);
  private readonly waiting: string[] = [];
  private current: string | null = null;
  private draining = false;
  private stopped = false;

  constructor(private readonly commandBus: CommandBus) {}

  /** Drops waiting jobs and accepts no more; they are recovered on the next boot. */
  stop(): void {
    this.stopped = true;
    this.waiting.length = 0;
  }

  enqueue(meetingFileId: string): void {
    if (
      this.stopped ||
      meetingFileId === this.current ||
      this.waiting.includes(meetingFileId)
    ) {
      return;
    }

    this.waiting.push(meetingFileId);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      let next = this.waiting.shift();
      while (next !== undefined) {
        this.current = next;
        await this.processOne(next);
        next = this.waiting.shift();
      }
    } finally {
      this.current = null;
      this.draining = false;
    }
  }

  private async processOne(meetingFileId: string): Promise<void> {
    try {
      await this.commandBus.execute(
        new ProcessTranscriptionCommand(meetingFileId),
      );
    } catch (error) {
      this.logger.error(
        `Processing ${meetingFileId} crashed: ${String(error)}`,
      );
    }
  }
}
