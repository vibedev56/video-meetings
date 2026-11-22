import { Loader } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from '@/lib/class-names';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-ds-md px-5 py-[11px] text-sm font-semibold outline-none transition-colors focus-visible:shadow-ds-ring disabled:cursor-not-allowed';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-ds-accent text-ds-on-accent hover:bg-ds-accent-hover active:bg-ds-accent-pressed disabled:bg-ds-accent-disabled disabled:text-ds-accent-disabled-text',
  secondary:
    'border border-ds-line-strong bg-ds-surface text-ds-ink hover:border-ds-line-hover hover:bg-ds-bg active:border-ds-line-hover active:bg-ds-secondary-pressed focus-visible:border-ds-accent focus-visible:shadow-none focus-visible:outline-2 focus-visible:outline-ds-accent disabled:border-ds-line disabled:bg-ds-disabled-bg disabled:text-ds-disabled-text',
  ghost:
    'text-ds-ink hover:bg-ds-sunken active:bg-ds-ghost-pressed disabled:bg-transparent disabled:text-ds-disabled-text',
  destructive:
    'bg-ds-danger text-ds-on-accent hover:bg-ds-danger-hover active:bg-ds-danger-pressed focus-visible:shadow-ds-ring-danger disabled:bg-ds-danger-disabled disabled:text-ds-danger-disabled-text',
};

/** Class list of a button variant, for elements that are not a <button> (such as a file-picker label). */
export function buttonClasses(variant: ButtonVariant = 'primary'): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classNames(
        buttonClasses(variant),
        isLoading && 'opacity-85',
        className,
      )}
      {...rest}
    >
      {isLoading && <Loader aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
