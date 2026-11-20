import type { HookCallback } from '@anthropic-ai/claude-agent-sdk';
import { createAiHooks } from './ai-hooks.js';
import { MeetingToolName, toMcpToolName } from './ai-analysis.constants.js';

const UPSERT = toMcpToolName(MeetingToolName.UPSERT_TASK);
const FIND = toMcpToolName(MeetingToolName.FIND_TASK);

const pre = (tool_name: string, tool_input: unknown) =>
  ({ hook_event_name: 'PreToolUse', tool_name, tool_input }) as never;

const decision = (output: unknown): string | undefined =>
  (output as { hookSpecificOutput?: { permissionDecision?: string } })
    .hookSpecificOutput?.permissionDecision;

function setup(maxCalls?: number) {
  const logger = { log: vi.fn() };
  const hooks = createAiHooks(logger, maxCalls);
  const run = (hook: HookCallback, input: never) =>
    hook(input, 'id', { signal: new AbortController().signal });
  return {
    logger,
    preHook: hooks.PreToolUse![0].hooks[0],
    postHook: hooks.PostToolUse![0].hooks[0],
    run,
  };
}

describe('createAiHooks', () => {
  it.each(['', '  ', 'ab', ' a '])(
    'denies upsertTask with title %j',
    async (title) => {
      const { preHook, run } = setup();
      expect(decision(await run(preHook, pre(UPSERT, { title })))).toBe('deny');
    },
  );

  it('denies upsertTask without a title', async () => {
    const { preHook, run } = setup();
    expect(decision(await run(preHook, pre(UPSERT, {})))).toBe('deny');
  });

  it('allows upsertTask with a valid title', async () => {
    const { preHook, run } = setup();
    expect(
      decision(await run(preHook, pre(UPSERT, { title: 'Send report' }))),
    ).toBeUndefined();
  });

  it('does not apply the title rule to other tools', async () => {
    const { preHook, run } = setup();
    expect(
      decision(await run(preHook, pre(FIND, { query: '' }))),
    ).toBeUndefined();
  });

  it('denies calls over the limit', async () => {
    const { preHook, run } = setup(2);
    const call = () => run(preHook, pre(FIND, { query: 'x' }));
    expect(decision(await call())).toBeUndefined();
    expect(decision(await call())).toBeUndefined();
    expect(decision(await call())).toBe('deny');
  });

  it('keeps the counter per hook set', async () => {
    const first = setup(1);
    const second = setup(1);
    await first.run(first.preHook, pre(FIND, {}));
    expect(
      decision(await second.run(second.preHook, pre(FIND, {}))),
    ).toBeUndefined();
  });

  it('logs name, arguments and result after a tool call', async () => {
    const { postHook, run, logger } = setup();
    await run(postHook, {
      hook_event_name: 'PostToolUse',
      tool_name: FIND,
      tool_input: { query: 'report' },
      tool_response: [{ title: 'Send report' }],
    } as never);
    const message = logger.log.mock.calls[0][0] as string;
    expect(message).toContain(FIND);
    expect(message).toContain('"query":"report"');
    expect(message).toContain('Send report');
  });
});
