import { TaskStatus } from './task-status.js';
import { TasksService, normalizeTaskTitle } from './tasks.service.js';

describe('TasksService', () => {
  const upsert = vi.fn();
  const findMany = vi.fn();
  let service: TasksService;

  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({ id: 't1', title: 'x' });
    findMany.mockReset().mockResolvedValue([]);
    service = new TasksService({ task: { upsert, findMany } } as never);
  });

  it('normalizes titles', () => {
    expect(normalizeTaskTitle('  Send   REPORT ')).toBe('send report');
  });

  it('scopes upsert to the meeting by composite key', async () => {
    await service.upsert('m1', { title: ' Send  report ', assignee: 'Ann' });
    const arg = upsert.mock.calls[0][0];
    expect(arg.where.sourceMeetingId_titleKey).toEqual({
      sourceMeetingId: 'm1',
      titleKey: 'send report',
    });
    expect(arg.create).toMatchObject({
      sourceMeetingId: 'm1',
      status: TaskStatus.OPEN,
      assignee: 'Ann',
    });
  });

  it('keeps stored assignee/status when omitted on update', async () => {
    await service.upsert('m1', { title: 'Send report' });
    const { update } = upsert.mock.calls[0][0];
    expect(update).not.toHaveProperty('assignee');
    expect(update).not.toHaveProperty('status');
  });

  it('scopes findByText to the meeting', async () => {
    await service.findByText('m1', 'report');
    const { where } = findMany.mock.calls[0][0];
    expect(where.sourceMeetingId).toBe('m1');
    expect(where.OR).toHaveLength(2);
  });

  it('lists the whole meeting for an empty query', async () => {
    await service.findByText('m1', '  ');
    expect(findMany.mock.calls[0][0].where).toEqual({ sourceMeetingId: 'm1' });
  });

  it('never touches another meeting on update', async () => {
    await service.upsert('m1', { title: 'Send report' });
    const arg = upsert.mock.calls[0][0];
    expect(arg.update).not.toHaveProperty('sourceMeetingId');
    expect(arg.where.sourceMeetingId_titleKey.sourceMeetingId).toBe('m1');
  });

  it('filters every findByText query by the meeting id', async () => {
    await service.findByText('m1', 'report');
    expect(JSON.stringify(findMany.mock.calls[0][0].where)).toContain('m1');
    expect(findMany.mock.calls[0][0].where.sourceMeetingId).toBe('m1');
  });
});
