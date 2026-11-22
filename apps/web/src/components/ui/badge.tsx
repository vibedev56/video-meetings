import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'neutral' | 'accent' | 'danger';
export type BadgeSize = 'md' | 'sm';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-ds-success-bg text-ds-success',
  warning: 'bg-ds-warning-bg text-ds-warning',
  neutral: 'bg-ds-sunken text-ds-muted',
  accent: 'bg-ds-accent-soft text-ds-accent',
  danger: 'bg-ds-danger-soft text-ds-danger',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  md: 'px-2.5 py-1.5 text-xs',
  sm: 'px-2 py-[3px] text-[11px]',
};

export interface BadgeProps {
  tone: BadgeTone;
  size?: BadgeSize;
  icon?: LucideIcon;
  children: ReactNode;
}

export function Badge({ tone, size = 'md', icon: Icon, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-ds-xl font-semibold ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]}`}
    >
      {Icon && <Icon aria-hidden className="size-[13px]" />}
      {children}
    </span>
  );
}
