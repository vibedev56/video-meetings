import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from '@/lib/class-names';

export interface ProfileChipProps extends ComponentPropsWithoutRef<'button'> {
  initial: string;
  label: string;
}

export function ProfileChip({
  initial,
  label,
  className,
  type = 'button',
  ...rest
}: ProfileChipProps) {
  return (
    <button
      type={type}
      className={classNames(
        'inline-flex items-center gap-2.5 rounded-ds-xl border border-ds-line py-1 pr-3 pl-1 outline-none transition-colors hover:bg-ds-sunken focus-visible:shadow-ds-ring',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-full bg-ds-accent-soft text-xs font-bold text-ds-accent"
      >
        {initial}
      </span>
      <span className="text-[13px] font-medium text-ds-ink">{label}</span>
      <ChevronDown aria-hidden className="size-3.5 text-ds-muted" />
    </button>
  );
}
