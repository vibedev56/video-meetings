'use client';

import { Card } from '@heroui/react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { LoadError } from '@/components/load-error';
import { PageSpinner } from '@/components/page-spinner';
import type { ProfileResponse } from '@/lib/api';
import { UserAvatar } from '@/components/user-avatar';
import { displayName } from '@/lib/profile';
import { useProfile } from '@/lib/use-profile';

export function ProfileView() {
  const { state, reload } = useProfile();

  return (
    <AppShell>
      {state.status === 'loading' && <PageSpinner />}
      {state.status === 'error' && (
        <LoadError title="Не удалось загрузить профиль" onRetry={reload} />
      )}
      {state.status === 'ready' && <ProfileCard profile={state.profile} />}
    </AppShell>
  );
}

function ProfileCard({ profile }: { profile: ProfileResponse }) {
  return (
    <Card>
      <Card.Content className="flex items-center gap-4">
        <UserAvatar profile={profile} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words text-zinc-950 dark:text-zinc-50">
            {displayName(profile)}
          </h1>
          <span className="text-sm break-all text-zinc-600 dark:text-zinc-400">
            {profile.email}
          </span>
        </div>
      </Card.Content>
      <Card.Footer>
        <Link
          href="/profile/edit"
          className="flex min-h-11 items-center text-sm font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300"
        >
          Редактировать профиль
        </Link>
      </Card.Footer>
    </Card>
  );
}
