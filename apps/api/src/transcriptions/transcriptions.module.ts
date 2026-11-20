import {
  Inject,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module.js';
import { ProcessTranscriptionHandler } from './commands/process-transcription.handler.js';
import { RecoverTranscriptionsCommand } from './commands/recover-transcriptions.command.js';
import { RecoverTranscriptionsHandler } from './commands/recover-transcriptions.handler.js';
import { StartTranscriptionHandler } from './commands/start-transcription.handler.js';
import { MeetingFileUploadedHandler } from './meeting-file-uploaded.handler.js';
import { GetTranscriptionHandler } from './queries/get-transcription.handler.js';
import { TranscriptionQueue } from './transcription.queue.js';
import {
  TRANSCRIPTION_RUNNER,
  type TranscriptionRunner,
} from './transcription.runner.js';
import { TranscriptionsController } from './transcriptions.controller.js';
import { WhisperCliRunner } from './whisper-cli.runner.js';

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [TranscriptionsController],
  providers: [
    MeetingFileUploadedHandler,
    StartTranscriptionHandler,
    ProcessTranscriptionHandler,
    RecoverTranscriptionsHandler,
    GetTranscriptionHandler,
    TranscriptionQueue,
    { provide: TRANSCRIPTION_RUNNER, useClass: WhisperCliRunner },
  ],
})
export class TranscriptionsModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queue: TranscriptionQueue,
    @Inject(TRANSCRIPTION_RUNNER) private readonly runner: TranscriptionRunner,
  ) {}

  /** Re-queues work interrupted by a restart. */
  async onApplicationBootstrap(): Promise<void> {
    const meetingFileIds: string[] = await this.commandBus.execute(
      new RecoverTranscriptionsCommand(),
    );
    meetingFileIds.forEach((id) => this.queue.enqueue(id));
  }

  /** Stops the queue and kills a running whisper, so none is orphaned. */
  onApplicationShutdown(): void {
    this.queue.stop();
    this.runner.shutdown?.();
  }
}
