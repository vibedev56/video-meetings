import { Injectable } from '@nestjs/common';
import { MeetingsService } from '../meetings/meetings.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import type { AiAnalysisResult } from './ai-analysis.schema.js';
import {
  normalizeDecisions,
  normalizeSummary,
  selectTasks,
} from './ai-result.normalizer.js';

export interface AiResultTarget {
  /** Fixed by the caller, never taken from the model's answer. */
  meetingId: string;
  ownerId: string;
}

/**
 * Writes a validated model answer to the database. The model has no tools: the
 * meeting and the owner come from the target, so the answer cannot reach
 * another meeting.
 */
@Injectable()
export class AiResultApplier {
  constructor(
    private readonly tasks: TasksService,
    private readonly meetings: MeetingsService,
  ) {}

  /** False when there is nothing to store (empty summary) or the owner check fails. */
  async apply(
    target: AiResultTarget,
    result: AiAnalysisResult,
  ): Promise<boolean> {
    const summary = normalizeSummary(result.summary);
    if (!summary) return false;

    // Owner check first, so a foreign meeting gets no tasks either.
    const saved = await this.meetings.updateAiResult(
      target.meetingId,
      target.ownerId,
      { summary, decisions: normalizeDecisions(result.decisions) },
    );
    if (!saved) return false;

    for (const task of selectTasks(result.tasks)) {
      await this.tasks.upsert(target.meetingId, task);
    }
    return true;
  }
}
