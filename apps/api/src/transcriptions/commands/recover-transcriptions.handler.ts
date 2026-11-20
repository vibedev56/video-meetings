import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { isTranscribableFile } from '../../meeting-files/transcribable-file.policy.js';
import { TranscriptionStatus } from '../transcription-status.js';
import { RecoverTranscriptionsCommand } from './recover-transcriptions.command.js';

@CommandHandler(RecoverTranscriptionsCommand)
export class RecoverTranscriptionsHandler implements ICommandHandler<
  RecoverTranscriptionsCommand,
  string[]
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<string[]> {
    await this.createMissingRows();
    await this.prisma.transcription.updateMany({
      where: { status: TranscriptionStatus.PROCESSING },
      data: { status: TranscriptionStatus.PENDING, startedAt: null },
    });

    const pending = await this.prisma.transcription.findMany({
      where: { status: TranscriptionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: { meetingFileId: true },
    });

    return pending.map((row) => row.meetingFileId);
  }

  /** Covers files whose row was never written, for example after a crash. */
  private async createMissingRows(): Promise<void> {
    const orphans = await this.prisma.meetingFile.findMany({
      where: { transcription: null },
      select: { id: true, originalName: true },
    });

    const missing = orphans.filter((file) =>
      isTranscribableFile(file.originalName),
    );
    if (missing.length === 0) return;

    await this.prisma.transcription.createMany({
      data: missing.map((file) => ({ meetingFileId: file.id })),
      skipDuplicates: true,
    });
  }
}
