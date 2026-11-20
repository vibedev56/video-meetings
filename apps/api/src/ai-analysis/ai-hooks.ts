import type {
  HookCallback,
  HookCallbackMatcher,
  Options,
} from '@anthropic-ai/claude-agent-sdk';
import {
  MAX_LOGGED_VALUE_CHARS,
  MAX_TOOL_CALLS,
  MIN_TASK_TITLE_LENGTH,
  MeetingToolName,
  toMcpToolName,
} from './ai-analysis.constants.js';

export interface HookLogger {
  log(message: string): void;
}

const truncate = (value: unknown): string => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return (text ?? '').slice(0, MAX_LOGGED_VALUE_CHARS);
};

const deny = (reason: string) => ({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse' as const,
    permissionDecision: 'deny' as const,
    permissionDecisionReason: reason,
  },
});

const hasShortTitle = (toolInput: unknown): boolean => {
  const title = (toolInput as { title?: unknown } | null)?.title;
  return (
    typeof title !== 'string' || title.trim().length < MIN_TASK_TITLE_LENGTH
  );
};

/**
 * Hooks for one agent run (the call counter lives in the closure, so create
 * them per run): limits tool calls, rejects empty task titles and logs results.
 */
export function createAiHooks(
  logger: HookLogger,
  maxToolCalls = MAX_TOOL_CALLS,
): NonNullable<Options['hooks']> {
  let toolCalls = 0;

  const preToolUse: HookCallback = async (input) => {
    if (input.hook_event_name !== 'PreToolUse') return {};
    toolCalls += 1;
    if (toolCalls > maxToolCalls) {
      return deny(`Tool call limit (${maxToolCalls}) reached`);
    }
    if (
      input.tool_name === toMcpToolName(MeetingToolName.UPSERT_TASK) &&
      hasShortTitle(input.tool_input)
    ) {
      return deny(
        `Task title must be at least ${MIN_TASK_TITLE_LENGTH} characters`,
      );
    }
    return {};
  };

  const postToolUse: HookCallback = async (input) => {
    if (input.hook_event_name !== 'PostToolUse') return {};
    logger.log(
      `tool=${input.tool_name} args=${truncate(input.tool_input)} result=${truncate(input.tool_response)}`,
    );
    return {};
  };

  const matchers = (hook: HookCallback): HookCallbackMatcher[] => [
    { hooks: [hook] },
  ];
  return {
    PreToolUse: matchers(preToolUse),
    PostToolUse: matchers(postToolUse),
  };
}
