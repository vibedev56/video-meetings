import { AiProcessingStatus } from '../meetings/meeting-ai-status.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import {
  AI_NOT_CONFIGURED_MESSAGE,
  MAX_AI_ATTEMPTS,
} from './ai-analysis.constants.js';

vi.mock('./ai-analysis.constants.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  AI_RETRY_DELAY_MS: 0,
}));

const MEETING_ID = 'm1';

function setup(
  options: { key?: string; runs?: Array<'ok' | 'empty' | 'throw'> } = {},
) {
  const queue = [...(options.runs ?? ['ok'])];
  const runner = {
    run: vi.fn(async (_input: unknown) => {
      const next = queue.shift() ?? 'ok';
      if (next === 'throw') throw new Error('boom');
      return { meetingUpdated: next === 'ok' };
    }),
  };
  const meetings = {
    getOwnerId: vi.fn().mockResolvedValue('owner'),
    markAiStatus: vi.fn().mockResolvedValue(true),
    markAiSkipped: vi.fn().mockResolvedValue(true),
    findOwnedForAi: vi
      .fn()
      .mockResolvedValue({ id: MEETING_ID, summary: null, decisions: [] }),
  };
  const prisma = {
    transcription: {
      findMany: vi.fn().mockResolvedValue([
        { text: 'hello', meetingFile: { originalName: 'a.mp3' } },
        { text: 'world', meetingFile: { originalName: 'b.mp3' } },
      ]),
    },
  };
  const config = {
    get: (key: string) =>
      key === 'ANTHROPIC_API_KEY' ? options.key : undefined,
  };
  const service = new AiAnalysisService(
    prisma as never,
    config as never,
    meetings as never,
    runner,
  );
  const statuses = () => meetings.markAiStatus.mock.calls.map((c) => c[1]);
  return { service, runner, meetings, statuses };
}

describe('AiAnalysisService', () => {
  it('goes IN_PROGRESS -> DONE and sends all files in one transcript', async () => {
    const { service, runner, statuses } = setup({ key: 'test-key' });
    await service.process(MEETING_ID);
    expect(statuses()).toEqual([
      AiProcessingStatus.IN_PROGRESS,
      AiProcessingStatus.DONE,
    ]);
    expect(runner.run).toHaveBeenCalledTimes(1);
    const input = runner.run.mock.calls[0][0] as {
      transcript: string;
      ownerId: string;
    };
    expect(input.transcript).toContain('hello');
    expect(input.transcript).toContain('world');
    expect(input.ownerId).toBe('owner');
  });

  it('retries after an error and after an invalid answer', async () => {
    const { service, runner, statuses } = setup({
      key: 'test-key',
      runs: ['throw', 'empty', 'ok'],
    });
    await service.process(MEETING_ID);
    expect(runner.run).toHaveBeenCalledTimes(3);
    expect(statuses().at(-1)).toBe(AiProcessingStatus.DONE);
  });

  it('ends FAILED after all attempts', async () => {
    const { service, runner, statuses } = setup({
      key: 'test-key',
      runs: ['throw', 'throw', 'throw', 'throw'],
    });
    await service.process(MEETING_ID);
    expect(runner.run).toHaveBeenCalledTimes(MAX_AI_ATTEMPTS);
    expect(statuses().at(-1)).toBe(AiProcessingStatus.FAILED);
  });

  it('skips softly without an API key and never calls the agent', async () => {
    const { service, runner, meetings } = setup();
    await service.process(MEETING_ID);
    expect(runner.run).not.toHaveBeenCalled();
    expect(meetings.markAiSkipped).toHaveBeenCalledWith(
      MEETING_ID,
      AI_NOT_CONFIGURED_MESSAGE,
    );
    expect(meetings.markAiStatus).not.toHaveBeenCalled();
  });

  it('does nothing for a missing meeting', async () => {
    const { service, runner, meetings } = setup({ key: 'test-key' });
    meetings.getOwnerId.mockResolvedValue(null);
    await service.process(MEETING_ID);
    expect(runner.run).not.toHaveBeenCalled();
    expect(meetings.markAiStatus).not.toHaveBeenCalled();
  });

  it('start() never rejects and serializes runs of one meeting', async () => {
    const { service, runner, meetings } = setup({ key: 'test-key' });
    let active = 0;
    let maxActive = 0;
    runner.run.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return { meetingUpdated: true };
    });
    meetings.markAiStatus.mockRejectedValueOnce(new Error('db down'));
    service.start(MEETING_ID);
    service.start(MEETING_ID);
    await service.idle(MEETING_ID);
    expect(maxActive).toBeLessThanOrEqual(1);
  });
});
