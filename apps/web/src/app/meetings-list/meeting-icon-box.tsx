import { Video } from 'lucide-react';

export function MeetingIconBox() {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-ds-md bg-ds-accent-soft text-ds-accent"
    >
      <Video className="size-[18px]" />
    </span>
  );
}
