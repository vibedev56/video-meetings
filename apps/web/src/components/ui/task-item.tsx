import { Check } from 'lucide-react';

export interface TaskItemProps {
  title: string;
  meta: string;
  isDone?: boolean;
}

export function TaskItem({ title, meta, isDone = false }: TaskItemProps) {
  return (
    <div className="flex gap-3 rounded-ds-md bg-ds-bg px-4 py-3.5">
      {isDone ? (
        <span
          aria-hidden
          className="flex size-[18px] shrink-0 items-center justify-center rounded-md bg-ds-accent text-ds-on-accent"
        >
          <Check className="size-3" />
        </span>
      ) : (
        <span
          aria-hidden
          className="size-[18px] shrink-0 rounded-md border-[1.5px] border-ds-check-border"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`text-sm font-semibold ${isDone ? 'text-ds-muted' : 'text-ds-ink'}`}
        >
          {title}
        </span>
        <span className="text-xs text-ds-muted">{meta}</span>
      </div>
    </div>
  );
}
