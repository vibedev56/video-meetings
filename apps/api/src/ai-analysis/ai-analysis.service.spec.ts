import { AiProcessingStatus } from '../meetings/meeting-ai-status.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import {
  AI_TRANSCRIPT_TRUNCATED_NOTE,
  MAX_AI_ATTEMPTS,
  MAX_TRANSCRIPT_CHARS,
  RETRY_CHUNK_SCALE,
} from './ai-analysis.constants.js';
import { AiRuntimeUnavailableError } from './ai-analysis.errors.js';

vi.mock('./ai-analysis.constants.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  AI_RETRY_DELAY_MS: 0,
}));

const MEETING_ID = 'm1';

type RunOutcome = 'ok' | 'empty' | 'throw' | 'unavailable';

function setup(options: { runs?: RunOutcome[] } = {}) {
  const queue = [...(options.runs ?? ['ok'])];
  const runner = {
    run: vi.fn(async (_input: unknown) => {
      const next = queue.shift() ?? 'ok';
      if (next === 'throw') throw new Error('boom');
      if (next === 'unavailable') {
        throw new AiRuntimeUnavailableError('Ollama is down');
      }
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
  const service = new AiAnalysisService(
    prisma as never,
    meetings as never,
    runner,
  );
  const statuses = () => meetings.markAiStatus.mock.calls.map((c) => c[1]);
  return { service, runner, meetings, statuses, prisma };
}

describe('AiAnalysisService', () => {
  it('goes IN_PROGRESS -> DONE and sends all files in one transcript', async () => {
    const { service, runner, statuses } = setup();
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
      runs: ['throw', 'empty', 'ok'],
    });
    await service.process(MEETING_ID);
    expect(runner.run).toHaveBeenCalledTimes(3);
    expect(statuses().at(-1)).toBe(AiProcessingStatus.DONE);
  });

  it('ends FAILED after all attempts', async () => {
    const { service, runner, statuses } = setup({
      runs: ['throw', 'throw', 'throw', 'throw'],
    });
    await service.process(MEETING_ID);
    expect(runner.run).toHaveBeenCalledTimes(MAX_AI_ATTEMPTS);
    expect(statuses().at(-1)).toBe(AiProcessingStatus.FAILED);
  });

  it('goes back to PENDING with a hint, without retries, when the local model is unavailable', async () => {
    const { service, runner, meetings, statuses } = setup({
      runs: ['unavailable'],
    });
    await service.process(MEETING_ID);
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(meetings.markAiSkipped).toHaveBeenCalledWith(
      MEETING_ID,
      'Ollama is down',
    );
    expect(statuses()).toEqual([AiProcessingStatus.IN_PROGRESS]);
  });

  it('does nothing for a missing meeting', async () => {
    const { service, runner, meetings } = setup();
    meetings.getOwnerId.mockResolvedValue(null);
    await service.process(MEETING_ID);
    expect(runner.run).not.toHaveBeenCalled();
    expect(meetings.markAiStatus).not.toHaveBeenCalled();
  });

  it('start() never rejects and serializes runs of one meeting', async () => {
    const { service, runner, meetings } = setup();
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

  it('shrinks the chunk size on every retry instead of repeating the request', async () => {
    const { service, runner } = setup({ runs: ['throw', 'empty', 'ok'] });
    await service.process(MEETING_ID);
    const scales = runner.run.mock.calls.map(
      (call) => (call[0] as { chunkScale: number }).chunkScale,
    );
    expect(scales).toEqual([1, RETRY_CHUNK_SCALE, RETRY_CHUNK_SCALE ** 2]);
  });

  it('does not stay silent when the transcript tail is dropped', async () => {
    const { service, meetings, prisma } = setup();
    prisma.transcription.findMany.mockResolvedValue([
      {
        text: 'x'.repeat(MAX_TRANSCRIPT_CHARS + 500),
        meetingFile: { originalName: 'a.mp3' },
      },
    ]);
    await service.process(MEETING_ID);
    expect(meetings.markAiStatus).toHaveBeenLastCalledWith(
      MEETING_ID,
      AiProcessingStatus.DONE,
      AI_TRANSCRIPT_TRUNCATED_NOTE,
    );
  });

  it('marks DONE without a note when the whole transcript fits', async () => {
    const { service, meetings } = setup();
    await service.process(MEETING_ID);
    expect(meetings.markAiStatus).toHaveBeenLastCalledWith(
      MEETING_ID,
      AiProcessingStatus.DONE,
      null,
    );
  });
});
