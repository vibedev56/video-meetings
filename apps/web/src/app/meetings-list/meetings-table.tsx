import { ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import type { MeetingResponse } from '@/lib/api';
import { formatMeetingDay, formatMeetingTime } from '@/lib/format';
import { isPastMeeting } from '@/lib/meeting-list';
import { MeetingIconBox } from './meeting-icon-box';
import { MeetingStateBadge } from './meeting-state-badge';

// Column widths of the design: the date column grows with the breakpoint.
const DATE_COLUMN_CLASSES = 'w-[150px] lg:w-[190px] desktop:w-[220px]';
const PARTICIPANTS_COLUMN_CLASSES = 'hidden w-[130px] desktop:block';
const HEAD_LABEL_CLASSES =
  'shrink-0 text-[11px] font-bold tracking-[0.8px] text-ds-muted uppercase';

/** Table layout of the meetings list (from 768px): head row and linked rows. */
export function MeetingsTable({
  meetings,
  now,
}: {
  meetings: MeetingResponse[];
  now: number;
}) {
  return (
    <div className="hidden md:block">
      <div
        aria-hidden
        className="flex gap-4 border-y border-ds-line bg-ds-bg px-5 py-2.5"
      >
        <span className={`${HEAD_LABEL_CLASSES} flex-1`}>Встреча</span>
        <span className={`${HEAD_LABEL_CLASSES} ${DATE_COLUMN_CLASSES}`}>
          <span className="lg:hidden">Дата</span>
          <span className="hidden lg:inline">Дата и время</span>
        </span>
        <span
          className={`${HEAD_LABEL_CLASSES} ${PARTICIPANTS_COLUMN_CLASSES}`}
        >
          Участники
        </span>
        <span className="w-5 shrink-0" />
      </div>
      <ul>
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <Link
              href={`/meetings/${meeting.id}`}
              className="flex items-center gap-4 border-b border-ds-line px-5 py-4 outline-none transition-colors hover:bg-ds-bg focus-visible:bg-ds-bg focus-visible:shadow-[inset_0_0_0_2px_var(--ds-accent)]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MeetingIconBox />
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <span className="max-w-full truncate text-base font-bold text-ds-ink">
                    {meeting.title}
                  </span>
                  <MeetingStateBadge
                    isPast={isPastMeeting(meeting, now)}
                    size="sm"
                  />
                </div>
              </div>
              <div
                className={`flex shrink-0 flex-col gap-0.5 ${DATE_COLUMN_CLASSES}`}
              >
                <span className="text-sm font-medium text-ds-ink">
                  {formatMeetingDay(meeting.date)}
                </span>
                <span className="text-[13px] text-ds-muted">
                  в {formatMeetingTime(meeting.date)}
                </span>
              </div>
              <div
                className={`hidden w-[130px] shrink-0 items-center gap-1.5 text-sm font-medium text-ds-ink desktop:flex`}
              >
                <Users aria-hidden className="size-3.5 text-ds-muted" />
                <span>{meeting.participants.length}</span>
                <span className="sr-only">участников</span>
              </div>
              <ChevronRight
                aria-hidden
                className="size-5 shrink-0 text-ds-muted"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
