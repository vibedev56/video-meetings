import type { ReactNode } from 'react';
import { AppHeader } from './app-header';

/** Page frame for signed-in pages: background, header and the content column. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-indigo-50 via-white to-violet-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
