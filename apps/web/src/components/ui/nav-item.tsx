import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from '@/lib/class-names';

export interface NavItemProps extends ComponentPropsWithoutRef<typeof Link> {
  isActive?: boolean;
}

export function NavItem({
  isActive = false,
  className,
  children,
  ...rest
}: NavItemProps) {
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={classNames(
        'rounded-ds-sm px-3.5 py-2 text-sm outline-none transition-colors focus-visible:shadow-ds-ring',
        isActive
          ? 'bg-ds-bg font-semibold text-ds-ink'
          : 'font-medium text-ds-muted hover:text-ds-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
