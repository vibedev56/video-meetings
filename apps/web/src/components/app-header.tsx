'use client';

import { Button } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAccessToken } from '@/lib/session';
import { UserAvatar } from '@/components/user-avatar';
import {
  clearProfileCache,
  useDisplayName,
  useProfile,
} from '@/lib/use-profile';

export function AppHeader() {
  const router = useRouter();
  const name = useDisplayName() ?? 'Профиль';
  const { state } = useProfile();

  function handleLogout() {
    clearAccessToken();
    clearProfileCache();
    router.replace('/auth/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          Видеовстречи
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/profile"
            aria-label={`Профиль: ${name}`}
            className="flex min-h-11 min-w-0 items-center gap-2 px-2 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {state.status === 'ready' && (
              <UserAvatar profile={state.profile} size="sm" />
            )}
            <span className="max-w-24 truncate min-[420px]:max-w-40 sm:max-w-64">
              {name}
            </span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onPress={handleLogout}
            className="min-h-11 min-w-11 shrink-0"
          >
            Выйти
          </Button>
        </div>
      </div>
    </header>
  );
}
