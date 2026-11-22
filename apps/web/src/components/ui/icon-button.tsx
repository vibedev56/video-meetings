import type { LucideIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from '@/lib/class-names';

export interface IconButtonProps extends ComponentPropsWithoutRef<'button'> {
  icon: LucideIcon;
  'aria-label': string;
}

export function IconButton({
  icon: Icon,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        'flex size-9 items-center justify-center rounded-[10px] border border-ds-line text-ds-muted outline-none transition-colors hover:bg-ds-sunken focus-visible:shadow-ds-ring disabled:cursor-not-allowed disabled:text-ds-disabled-text',
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}
