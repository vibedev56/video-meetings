import { Calendar, Users } from 'lucide-react';
import { DateBadge } from '@/components/ui';
import type { MeetingDetailResponse } from '@/lib/api';
import {
  formatDateBadge,
  formatMeetingDay,
  formatMeetingTime,
} from '@/lib/format';
import type { PipelineStep } from '@/lib/meeting-pipeline';
import { MeetingPipeline } from './meeting-pipeline';

/** Date badge, title, date and participants, with the processing pipeline. */
export function MeetingHero({
  meeting,
  steps,
}: {
  meeting: MeetingDetailResponse;
  steps: PipelineStep[];
}) {
  const { day, month } = formatDateBadge(meeting.date);
  const time = formatMeetingTime(meeting.date);

  return (
    <section
      aria-label="О встрече"
      className="overflow-hidden rounded-ds-lg border border-ds-line bg-ds-surface md:rounded-ds-xl"
    >
      <div className="flex items-center gap-3.5 p-5 md:gap-5 md:px-7 md:pt-7 md:pb-6">
        <DateBadge day={day} month={month} size="lg" tone="accent" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.8px] break-words text-ds-ink md:text-[32px]">
            {meeting.title}
          </h1>
          <ul className="flex flex-col gap-1.5 text-[13px] text-ds-muted md:flex-row md:text-sm md:items-center md:gap-4">
            <li className="flex items-center gap-1.5">
              <Calendar aria-hidden className="size-[15px] shrink-0" />
              {formatMeetingDay(meeting.date)}
              {time && ` в ${time}`}
            </li>
            <li className="flex items-center gap-1.5">
              <Users aria-hidden className="size-[15px] shrink-0" />
              Участников: {meeting.participants.length}
            </li>
          </ul>
        </div>
      </div>
      <MeetingPipeline steps={steps} />
    </section>
  );
}
