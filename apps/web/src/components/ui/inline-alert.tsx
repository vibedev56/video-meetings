import type { ReactNode } from 'react';

type InlineAlertTone = 'danger' | 'warning';

const TONE_CLASSES: Record<InlineAlertTone, string> = {
  danger: 'border-ds-danger bg-ds-danger-soft text-ds-danger',
  warning: 'border-ds-warning/30 bg-ds-warning-bg text-ds-warning',
};

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  title?: string;
  children?: ReactNode;
  /** An action under the text, for example a retry button. */
  action?: ReactNode;
}

/** A short in-page message: a failed request, a disabled feature. */
export function InlineAlert({
  tone = 'danger',
  title,
  children,
  action,
}: InlineAlertProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col gap-2 rounded-ds-md border px-3.5 py-3 text-[13px] font-medium ${TONE_CLASSES[tone]}`}
    >
      {title && <p className="font-bold">{title}</p>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
