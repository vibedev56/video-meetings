import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from '@/lib/class-names';

export interface TabProps extends ComponentPropsWithoutRef<'button'> {
  isActive?: boolean;
}

export function Tab({
  isActive = false,
  className,
  type = 'button',
  children,
  ...rest
}: TabProps) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={isActive}
      className={classNames(
        'rounded-ds-sm px-0.5 py-1.5 text-[13px] whitespace-nowrap md:px-3 outline-none transition-colors focus-visible:shadow-ds-ring',
        isActive
          ? 'bg-ds-surface font-semibold text-ds-ink shadow-ds-tab'
          : 'font-medium text-ds-muted hover:text-ds-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
