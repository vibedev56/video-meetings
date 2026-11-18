'use client';

import { Alert, Button, Card, Chip, Spinner } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, listMeetings, type MeetingResponse } from '@/lib/api';
import {
  clearAccessToken,
  getAccessToken,
  getEmailFromToken,
} from '@/lib/session';

const RECENT_MEETINGS_LIMIT = 3;

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      email: string;
      meetings: MeetingResponse[];
    };

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function sortByDateDesc(meetings: MeetingResponse[]) {
  return [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function HomeDashboard() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      const token = getAccessToken();
      const email = token ? getEmailFromToken(token) : null;
      if (!token || !email) {
        clearAccessToken();
        router.replace('/auth/login');
        return;
      }

      setState({ status: 'loading' });
      try {
        const meetings = await listMeetings(token);
        if (!isCancelled) {
          setState({ status: 'ready', email, meetings });
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }
        // 401 means the token is invalid or expired: force a new login.
        if (error instanceof ApiError && error.status === 401) {
          clearAccessToken();
          router.replace('/auth/login');
          return;
        }
        setState({ status: 'error' });
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [router, reloadKey]);

  function handleLogout() {
    clearAccessToken();
    router.replace('/auth/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-indigo-50 via-white to-violet-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Видеовстречи
          </span>
          <Button
            variant="outline"
            size="sm"
            onPress={handleLogout}
            className="min-h-11 min-w-11"
          >
            Выйти
          </Button>
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

        {state.status === 'error' && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить встречи</Alert.Title>
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
          <ReadyContent email={state.email} meetings={state.meetings} />
        )}
      </main>
    </div>
  );
}

function ReadyContent({
  email,
  meetings,
}: {
  email: string;
  meetings: MeetingResponse[];
}) {
  const recentMeetings = sortByDateDesc(meetings).slice(
    0,
    RECENT_MEETINGS_LIMIT,
  );

  return (
    <>
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Здравствуйте, <span className="break-words">{email}</span>!
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Здесь собраны ваши видеовстречи.
        </p>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <Card className="sm:w-56">
          <Card.Content className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Количество встреч
            </span>
            <span className="text-4xl font-semibold text-zinc-950 dark:text-zinc-50">
              {meetings.length}
            </span>
          </Card.Content>
        </Card>
        <Button size="lg" className="min-h-12 w-full sm:flex-1">
          Создать встречу
        </Button>
      </div>

      <section
        aria-labelledby="recent-meetings-title"
        className="flex flex-col gap-3"
      >
        <h2
          id="recent-meetings-title"
          className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
        >
          Последние встречи
        </h2>

        {recentMeetings.length === 0 ? (
          <Card>
            <Card.Content>
              <p className="text-zinc-600 dark:text-zinc-400">
                Встреч пока нет.
              </p>
            </Card.Content>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentMeetings.map((meeting) => (
              <li key={meeting.id}>
                <Card>
                  <Card.Content className="flex flex-col gap-2">
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                    >
                      {meeting.title}
                    </Link>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {dateFormatter.format(new Date(meeting.date))}
                    </span>
                    <Chip size="sm" variant="soft">
                      Участников: {meeting.participants.length}
                    </Chip>
                  </Card.Content>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
