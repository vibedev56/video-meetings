export const AI_MCP_SERVER_NAME = 'meeting';

export enum MeetingToolName {
  FIND_TASK = 'findTask',
  UPSERT_TASK = 'upsertTask',
  UPDATE_MEETING = 'updateMeeting',
}

/** Name under which the SDK exposes an in-process MCP tool to the model and hooks. */
export function toMcpToolName(tool: MeetingToolName): string {
  return `mcp__${AI_MCP_SERVER_NAME}__${tool}`;
}

export const DEFAULT_AI_MODEL = 'haiku';
export const AI_EFFORT = 'low';

export const MAX_TOOL_CALLS = 20;
export const MAX_TURNS = 12;
export const MIN_TASK_TITLE_LENGTH = 3;

export const MAX_AI_ATTEMPTS = 3;
export const AI_RETRY_DELAY_MS = 2000;
export const AI_RUN_TIMEOUT_MS = 5 * 60 * 1000;

export const MAX_TRANSCRIPT_CHARS = 100_000;
export const MAX_SUMMARY_CHARS = 5000;
export const MAX_DECISIONS = 30;
export const MAX_DECISION_CHARS = 500;
export const MAX_LOGGED_VALUE_CHARS = 500;

export const AI_FAILURE_MESSAGE = 'AI processing failed';
export const AI_NOT_CONFIGURED_MESSAGE = 'AI processing is not configured';
