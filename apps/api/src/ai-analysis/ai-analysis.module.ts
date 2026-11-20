import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MeetingsModule } from '../meetings/meetings.module.js';
import { MeetingsService } from '../meetings/meetings.service.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { AI_AGENT_RUNNER } from './ai-agent.runner.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import { ClaudeAgentRunner } from './claude-agent.runner.js';
import { TranscriptionCompletedHandler } from './transcription-completed.handler.js';

@Module({
  imports: [CqrsModule, MeetingsModule, TasksModule],
  providers: [
    AiAnalysisService,
    TranscriptionCompletedHandler,
    { provide: AI_AGENT_RUNNER, useClass: ClaudeAgentRunner },
  ],
})
export class AiAnalysisModule implements OnApplicationBootstrap {
  constructor(
    private readonly meetings: MeetingsService,
    private readonly service: AiAnalysisService,
  ) {}

  /** Re-runs analyses interrupted by a restart. */
  async onApplicationBootstrap(): Promise<void> {
    const meetingIds = await this.meetings.resetInterruptedAi();
    meetingIds.forEach((id) => this.service.start(id));
  }
}
