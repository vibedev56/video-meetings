import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TranscriptionQueue } from '../transcription.queue.js';
import { StartTranscriptionCommand } from './start-transcription.command.js';

const FOREIGN_KEY_VIOLATION_CODE = 'P2003';

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === FOREIGN_KEY_VIOLATION_CODE
  );
}

@CommandHandler(StartTranscriptionCommand)
export class StartTranscriptionHandler implements ICommandHandler<
  StartTranscriptionCommand,
  void
> {
  private readonly logger = new Logger(StartTranscriptionHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: TranscriptionQueue,
  ) {}

  async execute(command: StartTranscriptionCommand): Promise<void> {
    const { meetingFileId } = command;
    try {
      // The row is unique per file, so a repeated event creates nothing new.
      await this.prisma.transcription.upsert({
        where: { meetingFileId },
        create: { meetingFileId },
        update: {},
      });
    } catch (error) {
      // Only a deleted file is expected; anything else must reach the caller.
      if (!isForeignKeyViolation(error)) throw error;
      this.logger.warn(
        `File ${meetingFileId} was deleted before transcription`,
      );
      return;
    }

    this.queue.enqueue(meetingFileId);
  }
}
