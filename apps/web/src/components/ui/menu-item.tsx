import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { classNames } from '@/lib/class-names';

const BASE_CLASSES =
  'flex w-full items-center gap-3 rounded-ds-md px-3.5 py-3 text-left text-[15px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ds-accent aria-disabled:pointer-events-none aria-disabled:text-ds-disabled-text';

function itemClasses(isActive: boolean, className?: string) {
  return classNames(
    BASE_CLASSES,
    isActive
      ? 'bg-ds-accent-soft font-bold text-ds-accent'
      : 'font-semibold text-ds-ink hover:bg-ds-bg',
    className,
  );
}

function MenuItemContent({
  icon: Icon,
  isActive,
  children,
}: {
  icon: LucideIcon;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <Icon
        aria-hidden
        className={classNames(
          'size-[18px]',
          isActive ? 'text-ds-accent' : 'text-ds-muted',
        )}
      />
      <span className="flex-1">{children}</span>
      {isActive && <ChevronRight aria-hidden className="size-4" />}
    </>
  );
}

export interface MenuItemProps extends ComponentPropsWithoutRef<typeof Link> {
  icon: LucideIcon;
  isActive?: boolean;
}

export function MenuItem({
  icon,
  isActive = false,
  className,
  children,
  ...rest
}: MenuItemProps) {
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={itemClasses(isActive, className)}
      {...rest}
    >
      <MenuItemContent icon={icon} isActive={isActive}>
        {children}
      </MenuItemContent>
    </Link>
  );
}

export interface MenuButtonProps extends ComponentPropsWithoutRef<'button'> {
  icon: LucideIcon;
}

/** A menu row that runs an action (such as logging out) instead of navigating. */
export function MenuButton({
  icon,
  className,
  type = 'button',
  children,
  ...rest
}: MenuButtonProps) {
  return (
    <button type={type} className={itemClasses(false, className)} {...rest}>
      <MenuItemContent icon={icon} isActive={false}>
        {children}
      </MenuItemContent>
    </button>
  );
}
