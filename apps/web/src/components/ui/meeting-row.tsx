import { ChevronRight, Clock, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { DateBadge, type DateBadgeProps } from './date-badge';

export interface MeetingRowProps {
  date: DateBadgeProps;
  title: string;
  schedule: string;
  status?: ReactNode;
  participantsLabel?: string;
}

export function MeetingRow({
  date,
  title,
  schedule,
  status,
  participantsLabel,
}: MeetingRowProps) {
  return (
    <div className="flex items-center gap-[18px] rounded-ds-lg border border-ds-line bg-ds-surface px-5 py-[18px]">
      <DateBadge {...date} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-ds-title truncate text-ds-ink">{title}</span>
        <span className="flex items-center gap-1.5 text-[13px] text-ds-muted">
          <Clock aria-hidden className="size-[13px]" />
          {schedule}
        </span>
      </div>
      {status}
      {participantsLabel && (
        <span className="flex items-center gap-1.5 text-[13px] text-ds-muted">
          <Users aria-hidden className="size-3.5" />
          {participantsLabel}
        </span>
      )}
      <ChevronRight aria-hidden className="size-[18px] text-ds-muted" />
    </div>
  );
}
