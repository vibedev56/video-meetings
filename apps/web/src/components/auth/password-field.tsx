'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState } from 'react';
import { TextField, type TextFieldProps } from '@/components/ui';

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'icon' | 'trailing'>;

export function PasswordField(props: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ToggleIcon = isVisible ? EyeOff : Eye;

  return (
    <TextField
      {...props}
      icon={Lock}
      type={isVisible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={isVisible}
          disabled={props.disabled}
          onClick={() => setIsVisible((current) => !current)}
          className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-ds-sm text-ds-muted outline-none hover:text-ds-ink focus-visible:shadow-ds-ring disabled:text-ds-disabled-label"
        >
          <ToggleIcon aria-hidden className="size-[18px]" />
        </button>
      }
    />
  );
}
