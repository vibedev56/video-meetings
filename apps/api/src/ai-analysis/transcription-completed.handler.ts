import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TranscriptionCompletedEvent } from '../transcriptions/events/transcription-completed.event.js';
import { AiAnalysisService } from './ai-analysis.service.js';

/** Starts the AI analysis as soon as a transcript is saved (no button). */
@EventsHandler(TranscriptionCompletedEvent)
export class TranscriptionCompletedHandler implements IEventHandler<TranscriptionCompletedEvent> {
  constructor(private readonly service: AiAnalysisService) {}

  handle(event: TranscriptionCompletedEvent): void {
    this.service.start(event.meetingId);
  }
}
