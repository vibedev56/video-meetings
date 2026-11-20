import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TranscriptionStatus, type MeetingFileResponse } from '@/lib/api';
import {
  TRANSCRIPTION_POLL_INTERVAL_MS,
  useTranscriptionPolling,
} from './use-transcription-polling';

const apiMock = vi.hoisted(() => ({ listMeetingFiles: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  ...apiMock,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

function fileWith(status: TranscriptionStatus | null): MeetingFileResponse {
  return {
    id: 'f1',
    originalName: 'a.mp3',
    sizeBytes: 1,
    mimeType: 'audio/mpeg',
    uploadedAt: '2026-11-01T10:00:00.000Z',
    transcription: status ? { status, error: null } : null,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.setItem('accessToken', 't');
  apiMock.listMeetingFiles.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

describe('useTranscriptionPolling', () => {
  it('polls while a file is processing', async () => {
    const fresh = [fileWith(TranscriptionStatus.COMPLETED)];
    apiMock.listMeetingFiles.mockResolvedValue(fresh);
    const onFiles = vi.fn();

    renderHook(() =>
      useTranscriptionPolling(
        'm1',
        [fileWith(TranscriptionStatus.PROCESSING)],
        onFiles,
      ),
    );
    await act(() =>
      vi.advanceTimersByTimeAsync(TRANSCRIPTION_POLL_INTERVAL_MS),
    );

    expect(apiMock.listMeetingFiles).toHaveBeenCalledWith('t', 'm1');
    expect(onFiles).toHaveBeenCalledWith(fresh);
  });

  it('does not poll when all statuses are terminal or null', async () => {
    renderHook(() =>
      useTranscriptionPolling(
        'm1',
        [fileWith(TranscriptionStatus.FAILED), fileWith(null)],
        vi.fn(),
      ),
    );
    await act(() =>
      vi.advanceTimersByTimeAsync(TRANSCRIPTION_POLL_INTERVAL_MS * 3),
    );
    expect(apiMock.listMeetingFiles).not.toHaveBeenCalled();
  });

  it('stops on unmount', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([]);
    const { unmount } = renderHook(() =>
      useTranscriptionPolling(
        'm1',
        [fileWith(TranscriptionStatus.PENDING)],
        vi.fn(),
      ),
    );
    unmount();
    await act(() =>
      vi.advanceTimersByTimeAsync(TRANSCRIPTION_POLL_INTERVAL_MS * 2),
    );
    expect(apiMock.listMeetingFiles).not.toHaveBeenCalled();
  });
});
