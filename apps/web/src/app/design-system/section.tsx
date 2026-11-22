import type { ReactNode } from 'react';

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-ds-heading">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
