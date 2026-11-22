import { AiResultApplier } from './ai-result.applier.js';

const TARGET = { meetingId: 'meeting-1', ownerId: 'owner-1' };

function setup(saved = true) {
  const tasks = { upsert: vi.fn().mockResolvedValue({ id: 't1' }) };
  const meetings = { updateAiResult: vi.fn().mockResolvedValue(saved) };
  const applier = new AiResultApplier(tasks as never, meetings as never);
  return { tasks, meetings, applier };
}

describe('AiResultApplier', () => {
  it('stores summary, decisions and tasks for the fixed meeting and owner', async () => {
    const { tasks, meetings, applier } = setup();
    // Extra fields in the model answer (a foreign meetingId) are never used.
    const answer = {
      summary: ' Short ',
      decisions: ['A', 'a', ' '],
      tasks: [{ title: 'Send report', assignee: 'Anna' }, { title: 'x' }],
      meetingId: 'other',
      ownerId: 'other',
    };
    expect(await applier.apply(TARGET, answer)).toBe(true);
    expect(meetings.updateAiResult).toHaveBeenCalledWith(
      'meeting-1',
      'owner-1',
      { summary: 'Short', decisions: ['A'] },
    );
    expect(tasks.upsert).toHaveBeenCalledTimes(1);
    expect(tasks.upsert).toHaveBeenCalledWith('meeting-1', {
      title: 'Send report',
      assignee: 'Anna',
    });
  });

  it('returns false and stores nothing for an empty summary', async () => {
    const { tasks, meetings, applier } = setup();
    const result = await applier.apply(TARGET, {
      summary: '  ',
      decisions: [],
      tasks: [{ title: 'Send report' }],
    });
    expect(result).toBe(false);
    expect(meetings.updateAiResult).not.toHaveBeenCalled();
    expect(tasks.upsert).not.toHaveBeenCalled();
  });

  it('creates no tasks when the owner check fails', async () => {
    const { tasks, applier } = setup(false);
    const result = await applier.apply(TARGET, {
      summary: 'ok',
      decisions: [],
      tasks: [{ title: 'Send report' }],
    });
    expect(result).toBe(false);
    expect(tasks.upsert).not.toHaveBeenCalled();
  });
});
