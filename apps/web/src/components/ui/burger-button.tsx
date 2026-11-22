import { Menu, X } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from '@/lib/class-names';

export interface BurgerButtonProps extends ComponentPropsWithoutRef<'button'> {
  isOpen?: boolean;
  size?: 'md' | 'sm';
}

export function BurgerButton({
  isOpen = false,
  size = 'md',
  className,
  type = 'button',
  ...rest
}: BurgerButtonProps) {
  const Icon = isOpen ? X : Menu;
  return (
    <button
      type={type}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
      className={classNames(
        `${size === 'sm' ? 'size-9' : 'size-10'} flex items-center justify-center rounded-ds-md outline-none transition-colors focus-visible:shadow-ds-ring disabled:cursor-not-allowed disabled:border disabled:border-ds-line disabled:bg-ds-disabled-bg disabled:text-ds-disabled-text`,
        isOpen
          ? 'bg-ds-ink text-ds-on-accent'
          : 'border border-ds-line text-ds-ink hover:border-ds-line-strong hover:bg-ds-sunken',
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
