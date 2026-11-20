import {
  createMeetingTools,
  normalizeDecisions,
} from './meeting-tools.factory.js';

type Handler = (args: Record<string, unknown>) => Promise<{
  content: { text: string }[];
  isError?: boolean;
}>;

const registered = vi.hoisted(() => new Map<string, unknown>());
const schemas = vi.hoisted(() => new Map<string, Record<string, unknown>>());

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  tool: (
    name: string,
    _d: string,
    schema: Record<string, unknown>,
    handler: unknown,
  ) => {
    registered.set(name, handler);
    schemas.set(name, schema);
    return { name };
  },
  createSdkMcpServer: (options: unknown) => options,
}));

const MEETING_ID = 'meeting-1';
const OWNER_ID = 'owner-1';

function setup(updateResult = true) {
  const tasks = {
    findByText: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({ id: 't1' }),
  };
  const meetings = { updateAiResult: vi.fn().mockResolvedValue(updateResult) };
  const handle = createMeetingTools({
    meetingId: MEETING_ID,
    ownerId: OWNER_ID,
    tasks,
    meetings,
  });
  const call = (name: string, args: Record<string, unknown>) =>
    (registered.get(name) as Handler)(args);
  return { tasks, meetings, handle, call };
}

describe('createMeetingTools', () => {
  it.each(['findTask', 'upsertTask', 'updateMeeting'])(
    '%s does not accept meetingId or ownerId from the model',
    (name) => {
      setup();
      const keys = Object.keys(schemas.get(name) ?? {});
      expect(keys.length).toBeGreaterThan(0);
      expect(keys).not.toContain('meetingId');
      expect(keys).not.toContain('ownerId');
    },
  );

  it('always searches in the meeting bound at creation', async () => {
    const { tasks, call } = setup();
    // A model-supplied meetingId is ignored: it is not part of the input.
    await call('findTask', { query: 'report', meetingId: 'other' });
    expect(tasks.findByText).toHaveBeenCalledWith(MEETING_ID, 'report');
  });

  it('always upserts into the meeting bound at creation', async () => {
    const { tasks, call } = setup();
    await call('upsertTask', { title: 'Send report', meetingId: 'other' });
    expect(tasks.upsert).toHaveBeenCalledTimes(1);
    expect(tasks.upsert.mock.calls[0][0]).toBe(MEETING_ID);
  });

  it('updates the meeting with the bound meeting and owner', async () => {
    const { meetings, handle, call } = setup();
    expect(handle.wasMeetingUpdated()).toBe(false);
    await call('updateMeeting', {
      summary: ' Short ',
      decisions: ['A', 'a', ' '],
      meetingId: 'other',
      ownerId: 'other',
    });
    expect(meetings.updateAiResult).toHaveBeenCalledWith(MEETING_ID, OWNER_ID, {
      summary: 'Short',
      decisions: ['A'],
    });
    expect(handle.wasMeetingUpdated()).toBe(true);
  });

  it('reports an error and not success when the owner check fails', async () => {
    const { handle, call } = setup(false);
    const result = await call('updateMeeting', { summary: 'x' });
    expect(result.isError).toBe(true);
    expect(handle.wasMeetingUpdated()).toBe(false);
  });
});

describe('normalizeDecisions', () => {
  it('trims, drops empty and duplicate items', () => {
    expect(normalizeDecisions([' Ship ', 'ship', '', 'Test'])).toEqual([
      'Ship',
      'Test',
    ]);
  });
});
