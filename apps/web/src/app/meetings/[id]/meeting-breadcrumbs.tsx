import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/** Back link to the list, plus the current meeting title once it is known. */
export function MeetingBreadcrumbs({ title }: { title?: string }) {
  return (
    <nav aria-label="Навигация по страницам">
      <ol className="flex min-w-0 items-center gap-2 text-sm font-semibold">
        <li className="shrink-0">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-ds-sm text-ds-muted outline-none hover:text-ds-ink focus-visible:shadow-ds-ring"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Встречи
          </Link>
        </li>
        {title && (
          <>
            <li aria-hidden className="font-normal text-ds-line-strong">
              /
            </li>
            <li aria-current="page" className="min-w-0 truncate text-ds-ink">
              {title}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
