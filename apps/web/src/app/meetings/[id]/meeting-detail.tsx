'use client';

import { Spinner } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { Button, InlineAlert } from '@/components/ui';
import {
  getMeeting,
  hasStatus,
  type MeetingDetailResponse,
  type MeetingFileResponse,
} from '@/lib/api';
import { buildMeetingPipeline } from '@/lib/meeting-pipeline';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';
import { MeetingAiInsights } from './meeting-ai-insights';
import { MeetingBreadcrumbs } from './meeting-breadcrumbs';
import { MeetingFiles } from './meeting-files';
import { MeetingHero } from './meeting-hero';
import { useAiStatusPolling } from './use-ai-status-polling';

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; meeting: MeetingDetailResponse };

export function MeetingDetail({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  // Sticky: once transcription ran on this page, a PENDING AI status is polled.
  const [hasTranscriptionActivity, setHasTranscriptionActivity] =
    useState(false);
  // The files feed the pipeline above them; `null` until they are loaded.
  const [files, setFiles] = useState<MeetingFileResponse[] | null>(null);
  const handleTranscriptionActive = useCallback((isActive: boolean) => {
    if (isActive) setHasTranscriptionActivity(true);
  }, []);

  useAiStatusPolling(
    meetingId,
    state.status === 'ready' ? state.meeting : null,
    hasTranscriptionActivity,
    (meeting) => setState({ status: 'ready', meeting }),
  );

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      setState({ status: 'loading' });
      try {
        const meeting = await getMeeting(token, meetingId);
        if (!isCancelled) {
          setState({ status: 'ready', meeting });
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }
        if (redirectToLoginIfUnauthorized(error, router)) {
          return;
        }
        setState(
          hasStatus(error, 404) ? { status: 'not-found' } : { status: 'error' },
        );
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [router, meetingId, reloadKey]);

  const meeting = state.status === 'ready' ? state.meeting : null;
  const showFiles = state.status === 'loading' || state.status === 'ready';

  return (
    <AppShell width="wide" activeNav="meetings">
      <MeetingBreadcrumbs title={meeting?.title} />

      {state.status === 'loading' && (
        <div
          role="status"
          className="flex flex-1 items-center justify-center py-24"
        >
          <Spinner size="lg" aria-label="Загрузка" />
        </div>
      )}

      {state.status === 'not-found' && (
        <section className="flex flex-col gap-4 rounded-ds-lg border border-ds-line bg-ds-surface p-6 md:rounded-ds-xl">
          <h1 className="text-2xl font-bold tracking-[-0.6px] text-ds-ink">
            Встреча не найдена
          </h1>
          <p className="text-sm text-ds-muted">
            Возможно, встреча удалена или открыта по неверной ссылке.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center self-start rounded-ds-sm font-bold text-ds-accent outline-none hover:underline focus-visible:shadow-ds-ring"
          >
            Вернуться к списку встреч
          </Link>
        </section>
      )}

      {state.status === 'error' && (
        <InlineAlert
          title="Не удалось загрузить встречу"
          action={
            <Button
              variant="secondary"
              onClick={() => setReloadKey((key) => key + 1)}
              className="self-start px-4 py-2 text-[13px]"
            >
              Повторить
            </Button>
          }
        >
          Проверьте подключение и попробуйте снова.
        </InlineAlert>
      )}

      {meeting && (
        <MeetingHero
          meeting={meeting}
          steps={buildMeetingPipeline(files, {
            status: meeting.aiStatus,
            error: meeting.aiError,
          })}
        />
      )}

      {/* The files load in parallel with the meeting. They stay mounted while the meeting loads and are hidden only if the meeting is missing or failed. */}
      {showFiles && (
        <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-stretch">
          {meeting && <MeetingAiInsights meeting={meeting} />}
          <div className="order-first flex flex-col md:order-none lg:w-[360px] desktop:w-[420px] wide:w-[480px]">
            <MeetingFiles
              meetingId={meetingId}
              onTranscriptionActiveChange={handleTranscriptionActive}
              onFilesChange={setFiles}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}
