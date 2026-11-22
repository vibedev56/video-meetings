import { CloudUpload } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

export interface UploadHintProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children'
> {
  title?: string;
  description?: string;
  actionLabel?: string;
}

export function UploadHint({
  title = 'Загрузите запись встречи',
  description = 'Перетащите аудио или видео — мы сделаем саммари и выделим задачи',
  actionLabel = 'Выбрать файл',
  type = 'button',
  ...rest
}: UploadHintProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-ds-lg border border-ds-line-strong p-5">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-ds-md bg-ds-accent-soft text-ds-accent"
      >
        <CloudUpload className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold text-ds-ink">{title}</span>
        <span className="text-[13px] text-ds-muted">{description}</span>
      </div>
      <button
        type={type}
        className="rounded-ds-sm text-[13px] font-semibold text-ds-accent outline-none focus-visible:shadow-ds-ring"
        {...rest}
      >
        {actionLabel}
      </button>
    </div>
  );
}
