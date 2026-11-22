import type { LucideIcon } from 'lucide-react';

export type StatCardTone = 'dark' | 'light';

const TONE_CLASSES: Record<
  StatCardTone,
  { card: string; label: string; value: string }
> = {
  dark: {
    card: 'bg-ds-ink',
    label: 'text-ds-muted-on-dark',
    value: 'text-ds-on-accent',
  },
  light: {
    card: 'border border-ds-line bg-ds-surface',
    label: 'text-ds-muted',
    value: 'text-ds-ink',
  },
};

export interface StatCardProps {
  tone?: StatCardTone;
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}

export function StatCard({
  tone = 'light',
  label,
  value,
  hint,
  icon: Icon,
}: StatCardProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <div
      className={`flex flex-col gap-[18px] rounded-ds-lg p-5 ${classes.card}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-medium ${classes.label}`}>
          {label}
        </span>
        <Icon aria-hidden className={`size-[18px] ${classes.label}`} />
      </div>
      <div className="flex items-end gap-2.5">
        <span className={`text-ds-stat ${classes.value}`}>{value}</span>
        {hint && (
          <span className={`text-xs font-medium ${classes.label}`}>{hint}</span>
        )}
      </div>
    </div>
  );
}
