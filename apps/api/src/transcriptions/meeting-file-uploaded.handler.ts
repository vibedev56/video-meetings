import { Logger } from '@nestjs/common';
import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MeetingFileUploadedEvent } from '../meeting-files/events/meeting-file-uploaded.event.js';
import { StartTranscriptionCommand } from './commands/start-transcription.command.js';
import { isTranscribableFile } from '../meeting-files/transcribable-file.policy.js';

@EventsHandler(MeetingFileUploadedEvent)
export class MeetingFileUploadedHandler implements IEventHandler<MeetingFileUploadedEvent> {
  private readonly logger = new Logger(MeetingFileUploadedHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: MeetingFileUploadedEvent): Promise<void> {
    if (!isTranscribableFile(event.originalName)) return;

    try {
      await this.commandBus.execute(
        new StartTranscriptionCommand(event.meetingFileId),
      );
    } catch (error) {
      this.logger.error(
        `Could not start transcription of ${event.meetingFileId}: ${String(error)}`,
      );
    }
  }
}
