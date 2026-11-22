import { classNames } from '@/lib/class-names';

export interface DateBadgeProps {
  day: string | number;
  month: string;
  /** `lg` is the 72x76 badge of the meeting page hero (56x60 below 768px). */
  size?: 'md' | 'lg';
  tone?: 'neutral' | 'accent';
}

export function DateBadge({
  day,
  month,
  size = 'md',
  tone = 'neutral',
}: DateBadgeProps) {
  const isLarge = size === 'lg';
  const isAccent = tone === 'accent';
  return (
    <div
      className={classNames(
        'flex shrink-0 flex-col items-center justify-center',
        isLarge
          ? 'h-[60px] w-14 rounded-ds-md md:h-[76px] md:w-[72px] md:rounded-ds-lg'
          : 'h-14 w-[52px] rounded-ds-md',
        isAccent ? 'bg-ds-accent-soft' : 'bg-ds-bg',
      )}
    >
      <span
        className={classNames(
          'leading-[1.1] font-bold',
          isLarge ? 'text-[22px] md:text-[28px]' : 'text-xl',
          isAccent ? 'text-ds-accent' : 'text-ds-ink',
        )}
      >
        {day}
      </span>
      <span
        className={classNames(
          'text-[10px] font-bold tracking-[0.8px] uppercase',
          isAccent ? 'text-ds-accent' : 'text-ds-muted',
        )}
      >
        {month}
      </span>
    </div>
  );
}
