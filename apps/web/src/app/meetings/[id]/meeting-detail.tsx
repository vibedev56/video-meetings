'use client';

import { Alert, Button, Card, Spinner } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getMeeting, hasStatus, type MeetingDetailResponse } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';
import { MeetingAiInsights } from './meeting-ai-insights';
import { MeetingFiles } from './meeting-files';
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

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-indigo-50 via-white to-violet-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
          >
            Видеовстречи
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        {state.status === 'loading' && (
          <div
            role="status"
            className="flex flex-1 items-center justify-center py-24"
          >
            <Spinner size="lg" aria-label="Загрузка" />
          </div>
        )}

        {state.status === 'not-found' && (
          <Card>
            <Card.Content className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                Встреча не найдена
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                Возможно, встреча удалена или открыта по неверной ссылке.
              </p>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
              >
                Вернуться к списку встреч
              </Link>
            </Card.Content>
          </Card>
        )}

        {state.status === 'error' && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить встречу</Alert.Title>
              <Alert.Description>
                Проверьте подключение и попробуйте снова.
              </Alert.Description>
            </Alert.Content>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setReloadKey((key) => key + 1)}
              className="min-h-11"
            >
              Повторить
            </Button>
          </Alert>
        )}

        {state.status === 'ready' && (
          <section className="flex flex-col gap-2">
            <h1 className="break-words text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {state.meeting.title}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {formatDateTime(state.meeting.date)}
            </p>
          </section>
        )}

        {state.status === 'ready' && (
          <MeetingAiInsights meeting={state.meeting} />
        )}

        {/* Loads in parallel with the meeting. It stays mounted while the meeting loads and is hidden only if the meeting is missing or failed. */}
        {(state.status === 'loading' || state.status === 'ready') && (
          <MeetingFiles
            meetingId={meetingId}
            onTranscriptionActiveChange={handleTranscriptionActive}
          />
        )}
      </main>
    </div>
  );
}
