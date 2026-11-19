'use client';

import { Card, Chip } from '@heroui/react';
import Link from 'next/link';
import { CreateMeetingDialog } from './create-meeting-dialog';
import { AppShell } from '@/components/app-shell';
import { LoadError } from '@/components/load-error';
import { PageSpinner } from '@/components/page-spinner';
import { listMeetings, type MeetingResponse } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuthorizedLoad } from '@/lib/use-authorized-load';
import { useDisplayName } from '@/lib/use-profile';

const RECENT_MEETINGS_LIMIT = 3;

function sortByDateDesc(meetings: MeetingResponse[]) {
  return [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function HomeDashboard() {
  const { state, reload } = useAuthorizedLoad(listMeetings);
  const name = useDisplayName() ?? '';

  return (
    <AppShell>
      {state.status === 'loading' && <PageSpinner />}
      {state.status === 'error' && (
        <LoadError title="Не удалось загрузить встречи" onRetry={reload} />
      )}
      {state.status === 'ready' && (
        <ReadyContent name={name} meetings={state.data} />
      )}
    </AppShell>
  );
}

function ReadyContent({
  name,
  meetings,
}: {
  name: string;
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
          Здравствуйте, <span className="break-words">{name}</span>!
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
        <CreateMeetingDialog />
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
                      {formatDateTime(meeting.date)}
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
