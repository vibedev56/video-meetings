import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { MeetingsService } from '../meetings/meetings.service.js';
import {
  MAX_ASSIGNEE_LENGTH,
  MAX_TASK_TITLE_LENGTH,
} from '../tasks/tasks.constants.js';
import { TaskStatus } from '../tasks/task-status.js';
import type { TasksService } from '../tasks/tasks.service.js';
import {
  AI_MCP_SERVER_NAME,
  MAX_DECISION_CHARS,
  MAX_DECISIONS,
  MAX_SUMMARY_CHARS,
  MeetingToolName,
} from './ai-analysis.constants.js';

export interface MeetingToolsContext {
  /** Fixed by the caller; never a tool argument, so the model cannot pick another meeting. */
  meetingId: string;
  ownerId: string;
  tasks: Pick<TasksService, 'findByText' | 'upsert'>;
  meetings: Pick<MeetingsService, 'updateAiResult'>;
}

export interface MeetingToolsHandle {
  server: ReturnType<typeof createSdkMcpServer>;
  /** True once updateMeeting stored a result in this run. */
  wasMeetingUpdated(): boolean;
}

const jsonResult = (value: unknown, isError = false) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  ...(isError && { isError }),
});

export function normalizeDecisions(decisions: string[]): string[] {
  const unique = new Map<string, string>();
  for (const decision of decisions) {
    const text = decision.trim().slice(0, MAX_DECISION_CHARS);
    const key = text.toLowerCase();
    if (text && !unique.has(key)) unique.set(key, text);
  }
  return [...unique.values()].slice(0, MAX_DECISIONS);
}

export function createMeetingTools(
  context: MeetingToolsContext,
): MeetingToolsHandle {
  const { meetingId, ownerId, tasks, meetings } = context;
  let meetingUpdated = false;

  const findTask = tool(
    MeetingToolName.FIND_TASK,
    'Search tasks of the current meeting by text (title or assignee). An empty query lists them all.',
    { query: z.string().max(200) },
    async ({ query }) => jsonResult(await tasks.findByText(meetingId, query)),
  );

  const upsertTask = tool(
    MeetingToolName.UPSERT_TASK,
    'Create a task of the current meeting, or update the one with the same title.',
    {
      title: z.string().max(MAX_TASK_TITLE_LENGTH),
      assignee: z.string().max(MAX_ASSIGNEE_LENGTH).optional(),
      status: z.enum(TaskStatus).optional(),
    },
    async (input) => jsonResult(await tasks.upsert(meetingId, input)),
  );

  const updateMeeting = tool(
    MeetingToolName.UPDATE_MEETING,
    'Store the summary and the list of decisions of the current meeting (replaces the stored values).',
    {
      summary: z.string().max(MAX_SUMMARY_CHARS).optional(),
      decisions: z.array(z.string()).optional(),
    },
    async ({ summary, decisions }) => {
      const update = {
        ...(summary?.trim() && { summary: summary.trim() }),
        ...(decisions && { decisions: normalizeDecisions(decisions) }),
      };
      const saved = await meetings.updateAiResult(meetingId, ownerId, update);
      if (!saved) return jsonResult({ error: 'Meeting not found' }, true);
      meetingUpdated = true;
      return jsonResult({ ok: true });
    },
  );

  return {
    server: createSdkMcpServer({
      name: AI_MCP_SERVER_NAME,
      tools: [findTask, upsertTask, updateMeeting],
    }),
    wasMeetingUpdated: () => meetingUpdated,
  };
}
