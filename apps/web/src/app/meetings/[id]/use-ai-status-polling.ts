import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getMeeting, type MeetingDetailResponse } from '@/lib/api';
import { shouldPollAiStatus } from '@/lib/ai-status';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';

export const AI_POLL_INTERVAL_MS = 3000;
/** Whisper (up to 30 minutes) plus the AI run. */
export const MAX_AI_POLLING_DURATION_MS = 40 * 60 * 1000;

/**
 * Re-fetches the meeting every few seconds until its AI status is DONE or
 * FAILED. While transcription is active (or was on this page) a PENDING
 * status is polled too, so there is no gap between the two stages. Pass
 * `null` while the meeting is not loaded.
 */
export function useAiStatusPolling(
  meetingId: string,
  meeting: MeetingDetailResponse | null,
  hasTranscriptionActivity: boolean,
  onMeeting: (meeting: MeetingDetailResponse) => void,
) {
  const router = useRouter();
  const onMeetingRef = useRef(onMeeting);
  useEffect(() => {
    onMeetingRef.current = onMeeting;
  });

  const isActive =
    meeting !== null &&
    shouldPollAiStatus(
      meeting.aiStatus,
      hasTranscriptionActivity,
      meeting.aiError,
    );
  const statusKey = meeting?.aiStatus ?? '';
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      startedAtRef.current = null;
      return;
    }
    startedAtRef.current ??= Date.now();
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const startedAt = startedAtRef.current ?? Date.now();
      if (Date.now() - startedAt > MAX_AI_POLLING_DURATION_MS) return;
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth/login');
        return;
      }
      try {
        const fresh = await getMeeting(token, meetingId);
        if (isCancelled) return;
        onMeetingRef.current(fresh);
      } catch (error) {
        if (isCancelled) return;
        if (redirectToLoginIfUnauthorized(error, router)) return;
        // Transient error: try again on the next tick.
      }
      timer = setTimeout(poll, AI_POLL_INTERVAL_MS);
    }

    timer = setTimeout(poll, AI_POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isActive, statusKey, meetingId, router]);
}
