import { ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import type { MeetingResponse } from '@/lib/api';
import { formatMeetingDateLine } from '@/lib/format';
import { isPastMeeting } from '@/lib/meeting-list';
import { MeetingIconBox } from './meeting-icon-box';
import { MeetingStateBadge } from './meeting-state-badge';

/** Card layout of the meetings list (below 768px). */
export function MeetingCards({
  meetings,
  now,
}: {
  meetings: MeetingResponse[];
  now: number;
}) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <Link
            href={`/meetings/${meeting.id}`}
            className="flex flex-col gap-3 rounded-ds-lg border border-ds-line bg-ds-surface p-4 outline-none transition-colors hover:bg-ds-bg focus-visible:shadow-ds-ring"
          >
            <div className="flex items-center gap-3">
              <MeetingIconBox />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[17px] font-bold text-ds-ink">
                  {meeting.title}
                </span>
                <span className="text-[13px] text-ds-muted">
                  {formatMeetingDateLine(meeting.date)}
                </span>
              </div>
              <ChevronRight
                aria-hidden
                className="size-5 shrink-0 text-ds-muted"
              />
            </div>
            <div className="flex items-center gap-2">
              <MeetingStateBadge isPast={isPastMeeting(meeting, now)} />
            </div>
            <span className="flex items-center gap-1.5 text-[13px] text-ds-muted">
              <Users aria-hidden className="size-3.5" />
              Участников: {meeting.participants.length}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
