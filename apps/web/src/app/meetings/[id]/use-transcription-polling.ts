import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { listMeetingFiles, type MeetingFileResponse } from '@/lib/api';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';
import { isActiveTranscriptionStatus } from '@/lib/transcription-status';

export const TRANSCRIPTION_POLL_INTERVAL_MS = 3000;
/** A bit more than the API's whisper timeout (30 minutes). */
export const MAX_POLLING_DURATION_MS = 35 * 60 * 1000;

export function hasActiveTranscription(files: MeetingFileResponse[]): boolean {
  return files.some(
    (file) =>
      file.transcription !== null &&
      isActiveTranscriptionStatus(file.transcription.status),
  );
}

/**
 * Re-fetches the file list every few seconds while any file is PENDING or
 * PROCESSING. Stops once all are terminal and on unmount. Pass `null` while
 * the list is not loaded.
 */
export function useTranscriptionPolling(
  meetingId: string,
  files: MeetingFileResponse[] | null,
  onFiles: (files: MeetingFileResponse[]) => void,
) {
  const router = useRouter();
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  const isActive = files !== null && hasActiveTranscription(files);
  // Changes whenever the list changes locally (delete, upload) or on the
  // server, which cancels a request still in flight and drops its result.
  const filesKey = files
    ? files.map((file) => `${file.id}:${file.transcription?.status}`).join(',')
    : '';
  const pollingStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      pollingStartedAtRef.current = null;
      return;
    }
    pollingStartedAtRef.current ??= Date.now();
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const startedAt = pollingStartedAtRef.current ?? Date.now();
      if (Date.now() - startedAt > MAX_POLLING_DURATION_MS) {
        // A job stuck on the server must not keep the page polling forever.
        return;
      }
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth/login');
        return;
      }
      try {
        const fresh = await listMeetingFiles(token, meetingId);
        if (isCancelled) return;
        onFilesRef.current(fresh);
      } catch (error) {
        if (isCancelled) return;
        if (redirectToLoginIfUnauthorized(error, router)) return;
        // Other errors are transient: try again on the next tick.
      }
      // Scheduled after the request ends, so slow requests never overlap.
      timer = setTimeout(poll, TRANSCRIPTION_POLL_INTERVAL_MS);
    }

    timer = setTimeout(poll, TRANSCRIPTION_POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isActive, filesKey, meetingId, router]);
}
