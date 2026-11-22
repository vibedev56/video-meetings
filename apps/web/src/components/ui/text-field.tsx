import type { LucideIcon } from 'lucide-react';
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { classNames } from '@/lib/class-names';

export interface TextFieldProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'id'
> {
  label: string;
  icon?: LucideIcon;
  /** Element at the end of the field, e.g. a show-password button. */
  trailing?: ReactNode;
  hint?: string;
  error?: string;
}

export function TextField({
  label,
  icon: Icon,
  trailing,
  hint,
  error,
  required,
  disabled,
  className,
  ...rest
}: TextFieldProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  const hasError = Boolean(error);

  return (
    <div className={classNames('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={inputId}
        className={classNames(
          'text-[13px] font-semibold',
          disabled ? 'text-ds-disabled-label' : 'text-ds-ink',
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-ds-danger">*</span>}
      </label>
      <div
        className={classNames(
          'group flex h-11 items-center gap-2.5 rounded-ds-md border px-3.5 transition-shadow',
          disabled && 'border-ds-line bg-ds-sunken',
          hasError && 'border-[1.5px] border-ds-danger bg-ds-danger-soft',
          !disabled &&
            !hasError &&
            'border-ds-line-strong bg-ds-surface focus-within:border-[1.5px] focus-within:border-ds-accent focus-within:shadow-[0_0_6px_#4b3bff40]',
        )}
      >
        {Icon && (
          <Icon
            aria-hidden
            className={classNames(
              'size-[18px] shrink-0',
              disabled && 'text-ds-disabled-label',
              hasError && 'text-ds-danger',
              !disabled &&
                !hasError &&
                'text-ds-muted group-focus-within:text-ds-accent',
            )}
          />
        )}
        <input
          id={inputId}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          className="w-full min-w-0 bg-transparent text-sm font-medium text-ds-ink outline-none placeholder:text-ds-muted autofill:transition-[background-color] autofill:delay-[600000s] disabled:text-ds-disabled-label"
          {...rest}
        />
        {trailing}
      </div>
      {message && (
        <span
          id={messageId}
          className={classNames(
            'text-xs font-medium',
            hasError ? 'text-ds-danger' : 'text-ds-muted',
          )}
        >
          {message}
        </span>
      )}
    </div>
  );
}
