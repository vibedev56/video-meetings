import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiProcessingStatus, type MeetingDetailResponse } from '@/lib/api';
import {
  AI_POLL_INTERVAL_MS,
  useAiStatusPolling,
} from './use-ai-status-polling';

const apiMock = vi.hoisted(() => ({ getMeeting: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  ...apiMock,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

function meetingWith(aiStatus: AiProcessingStatus): MeetingDetailResponse {
  return {
    id: 'm1',
    title: 'T',
    date: '2026-11-01T10:00:00.000Z',
    participants: [],
    summary: null,
    decisions: [],
    aiStatus,
    aiError: null,
    tasks: [],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.setItem('accessToken', 't');
  apiMock.getMeeting.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

describe('useAiStatusPolling', () => {
  it('polls while the status is IN_PROGRESS', async () => {
    const fresh = meetingWith(AiProcessingStatus.DONE);
    apiMock.getMeeting.mockResolvedValue(fresh);
    const onMeeting = vi.fn();

    renderHook(() =>
      useAiStatusPolling(
        'm1',
        meetingWith(AiProcessingStatus.IN_PROGRESS),
        false,
        onMeeting,
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS));

    expect(apiMock.getMeeting).toHaveBeenCalledWith('t', 'm1');
    expect(onMeeting).toHaveBeenCalledWith(fresh);
  });

  it('polls PENDING only after transcription activity', async () => {
    apiMock.getMeeting.mockResolvedValue(
      meetingWith(AiProcessingStatus.PENDING),
    );
    const pending = meetingWith(AiProcessingStatus.PENDING);

    renderHook(() => useAiStatusPolling('m1', pending, false, vi.fn()));
    await act(() => vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 2));
    expect(apiMock.getMeeting).not.toHaveBeenCalled();

    renderHook(() => useAiStatusPolling('m1', pending, true, vi.fn()));
    await act(() => vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS));
    expect(apiMock.getMeeting).toHaveBeenCalledTimes(1);
  });

  it.each([AiProcessingStatus.DONE, AiProcessingStatus.FAILED])(
    'does not poll on terminal status %s',
    async (status) => {
      renderHook(() =>
        useAiStatusPolling('m1', meetingWith(status), true, vi.fn()),
      );
      await act(() => vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 3));
      expect(apiMock.getMeeting).not.toHaveBeenCalled();
    },
  );
});
