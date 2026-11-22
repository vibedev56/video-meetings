'use client';

import { useState } from 'react';
import { CreateMeetingDialog } from '@/app/create-meeting-dialog';
import type { MeetingResponse } from '@/lib/api';
import { formatMeetingsCount } from '@/lib/format';
import {
  filterMeetings,
  isPastMeeting,
  MeetingFilter,
  sortByDateDesc,
} from '@/lib/meeting-list';
import { MeetingCards } from './meeting-cards';
import { MeetingsTable } from './meetings-table';
import { MeetingsToolbar } from './meetings-toolbar';

function describeSummary(meetings: MeetingResponse[], now: number) {
  if (meetings.length === 0) {
    return 'Встреч пока нет';
  }
  const upcomingCount = meetings.filter((m) => !isPastMeeting(m, now)).length;
  return `${formatMeetingsCount(meetings.length)} · предстоящих: ${upcomingCount}`;
}

/** The meetings page body: heading, create button, filters and the list. */
export function MeetingsList({ meetings }: { meetings: MeetingResponse[] }) {
  const [filter, setFilter] = useState(MeetingFilter.ALL);
  const [search, setSearch] = useState('');
  // Fixed per mount, so the "past" badge of a row never flips while rendering.
  const [now] = useState(() => Date.now());

  const sortedMeetings = sortByDateDesc(meetings);
  const visibleMeetings = filterMeetings(sortedMeetings, {
    filter,
    search,
    now,
  });
  const isEmpty = visibleMeetings.length === 0;

  return (
    <>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.8px] text-ds-ink md:text-[32px] lg:text-4xl">
            Встречи
          </h1>
          <p className="text-sm text-ds-muted md:text-[15px]">
            {describeSummary(meetings, now)}
          </p>
        </div>
        <CreateMeetingDialog className="w-full md:w-auto" />
      </div>

      <section
        aria-label="Список встреч"
        className="flex flex-col gap-5 md:gap-0 md:overflow-hidden md:rounded-ds-lg md:border md:border-ds-line md:bg-ds-surface"
      >
        <MeetingsToolbar
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          totalCount={meetings.length}
        />

        {isEmpty ? (
          <p
            role="status"
            className="rounded-ds-lg border border-ds-line bg-ds-surface px-5 py-10 text-center text-sm text-ds-muted md:rounded-none md:border-0 md:border-y md:bg-transparent"
          >
            {meetings.length === 0
              ? 'Встреч пока нет. Создайте первую встречу.'
              : 'Ничего не найдено. Измените фильтр или запрос.'}
          </p>
        ) : (
          <>
            <MeetingsTable meetings={visibleMeetings} now={now} />
            <MeetingCards meetings={visibleMeetings} now={now} />
          </>
        )}

        <div className="hidden items-center justify-between gap-4 bg-ds-bg px-5 py-3 text-[13px] text-ds-muted md:flex">
          <span>
            Показано {visibleMeetings.length} из {meetings.length}
          </span>
          <span className="text-right">
            <span className="lg:hidden">
              Откройте встречу, чтобы загрузить запись
            </span>
            <span className="hidden lg:inline">
              Нажмите на встречу, чтобы загрузить запись и получить ИИ-анализ
            </span>
          </span>
        </div>
      </section>
    </>
  );
}
