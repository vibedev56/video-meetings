'use client';

import { Alert, Button, Card, Spinner } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProfile, type ProfileResponse } from '@/lib/api';
import { displayName, getInitials } from '@/lib/profile';
import {
  clearAccessToken,
  getAccessToken,
  redirectToLoginIfUnauthorized,
} from '@/lib/session';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; profile: ProfileResponse };

export function ProfileView() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      const token = getAccessToken();
      if (!token) {
        clearAccessToken();
        router.replace('/auth/login');
        return;
      }

      setState({ status: 'loading' });
      try {
        const profile = await getProfile(token);
        if (!isCancelled) {
          setState({ status: 'ready', profile });
        }
      } catch (error) {
        if (isCancelled || redirectToLoginIfUnauthorized(error, router)) {
          return;
        }
        setState({ status: 'error' });
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [router, reloadKey]);

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-indigo-50 via-white to-violet-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          >
            Видеовстречи
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        {state.status === 'loading' && (
          <div
            role="status"
            className="flex flex-1 items-center justify-center py-24"
          >
            <Spinner size="lg" aria-label="Загрузка" />
          </div>
        )}

        {state.status === 'error' && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить профиль</Alert.Title>
              <Alert.Description>
                Проверьте подключение и попробуйте снова.
              </Alert.Description>
            </Alert.Content>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setReloadKey((key) => key + 1)}
              className="min-h-11"
            >
              Повторить
            </Button>
          </Alert>
        )}

        {state.status === 'ready' && <ProfileCard profile={state.profile} />}
      </main>
    </div>
  );
}

function ProfileCard({ profile }: { profile: ProfileResponse }) {
  return (
    <Card>
      <Card.Content className="flex items-center gap-4">
        <div
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xl font-semibold text-white"
        >
          {getInitials(profile)}
        </div>
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
          Изменить имя
        </Link>
      </Card.Footer>
    </Card>
  );
}
