import NextLink from 'next/link';
import type { ReactNode } from 'react';

export interface AuthSwitchProps {
  question: string;
  linkLabel: string;
  href: string;
  children?: ReactNode;
}

/** Divider and the "other auth screen" link under an auth form. */
export function AuthSwitch({
  question,
  linkLabel,
  href,
  children,
}: AuthSwitchProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-ds-line pt-4">
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm font-medium text-ds-muted">
        {question}
        <NextLink
          href={href}
          className="inline-flex min-h-11 items-center rounded-ds-sm font-bold text-ds-accent outline-none hover:underline focus-visible:shadow-ds-ring"
        >
          {linkLabel}
        </NextLink>
      </p>
      {children}
    </div>
  );
}
