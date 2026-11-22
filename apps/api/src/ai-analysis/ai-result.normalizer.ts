import { MAX_TASK_TITLE_LENGTH } from '../tasks/tasks.constants.js';
import { normalizeTaskTitle } from '../tasks/tasks.service.js';
import type { AiAnalysisResult } from './ai-analysis.schema.js';
import {
  MAX_DECISION_CHARS,
  MAX_DECISIONS,
  MAX_SUMMARY_CHARS,
  MAX_TASKS,
  MIN_TASK_TITLE_LENGTH,
} from './ai-analysis.constants.js';

export type AiTask = AiAnalysisResult['tasks'][number];

export function normalizeSummary(summary: string): string {
  return summary.trim().slice(0, MAX_SUMMARY_CHARS);
}

/** Trims, drops empty and duplicate (case-insensitive) items, caps the count. */
export function normalizeDecisions(decisions: string[]): string[] {
  const unique = new Map<string, string>();
  for (const decision of decisions) {
    const text = decision.trim().slice(0, MAX_DECISION_CHARS);
    const key = text.toLowerCase();
    if (text && !unique.has(key)) unique.set(key, text);
  }
  return [...unique.values()].slice(0, MAX_DECISIONS);
}

/**
 * Drops titles shorter than MIN_TASK_TITLE_LENGTH, dedupes by the normalized
 * title (the first occurrence wins) and keeps at most MAX_TASKS tasks.
 */
export function selectTasks(tasks: AiTask[]): AiTask[] {
  const unique = new Map<string, AiTask>();
  for (const task of tasks) {
    // Same cut as TasksService.upsert, so the key here equals the stored titleKey.
    const title = task.title.trim().slice(0, MAX_TASK_TITLE_LENGTH);
    const key = normalizeTaskTitle(title);
    if (title.length < MIN_TASK_TITLE_LENGTH || unique.has(key)) continue;
    unique.set(key, { ...task, title });
  }
  return [...unique.values()].slice(0, MAX_TASKS);
}
