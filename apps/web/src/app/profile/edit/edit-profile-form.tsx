'use client';

import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { ApiError, getProfile, updateProfile } from '@/lib/api';
import {
  clearAccessToken,
  getAccessToken,
  redirectToLoginIfUnauthorized,
} from '@/lib/session';

/** Mirrors `MAX_NAME_LENGTH` in the API. */
const MAX_NAME_LENGTH = 100;

function validateName(value: string) {
  return value.trim().length > MAX_NAME_LENGTH
    ? `Имя не должно быть длиннее ${MAX_NAME_LENGTH} символов`
    : null;
}

type LoadState = 'loading' | 'error' | 'ready';

export function EditProfileForm() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  // Validation is shown only after the first submit attempt.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      const token = getAccessToken();
      if (!token) {
        clearAccessToken();
        router.replace('/auth/login');
        return;
      }

      setLoadState('loading');
      try {
        const profile = await getProfile(token);
        if (!isCancelled) {
          setName(profile.name ?? '');
          setLoadState('ready');
        }
      } catch (error) {
        if (isCancelled || redirectToLoginIfUnauthorized(error, router)) {
          return;
        }
        setLoadState('error');
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [router, reloadKey]);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (validateName(name)) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      clearAccessToken();
      router.replace('/auth/login');
      return;
    }

    setGeneralError(null);
    setIsSaved(false);
    setIsSubmitting(true);

    try {
      const profile = await updateProfile(token, name.trim());
      setName(profile.name ?? '');
      setIsSaved(true);
    } catch (error) {
      if (redirectToLoginIfUnauthorized(error, router)) {
        return;
      }
      if (error instanceof ApiError && error.status === 400) {
        setGeneralError('Проверьте имя и попробуйте снова.');
      } else if (error instanceof ApiError && error.status !== 0) {
        setGeneralError('Не удалось сохранить имя. Попробуйте позже.');
      } else {
        setGeneralError('Сервер недоступен. Проверьте подключение.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <Link
          href="/profile"
          className="flex min-h-11 w-fit items-center text-sm font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300"
        >
          Назад к профилю
        </Link>

        {loadState === 'loading' && (
          <div
            role="status"
            className="flex flex-1 items-center justify-center py-24"
          >
            <Spinner size="lg" aria-label="Загрузка" />
          </div>
        )}

        {loadState === 'error' && (
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

        {loadState === 'ready' && (
          <Card>
            <Card.Header>
              <Card.Title className="text-2xl">Изменить имя</Card.Title>
              <Card.Description>
                Имя видно в профиле и в шапке. Если оставить поле пустым, будет
                показан email.
              </Card.Description>
            </Card.Header>

            <Form
              onSubmit={handleSubmit}
              validationBehavior="aria"
              className="flex flex-col gap-6"
            >
              <Card.Content className="flex flex-col gap-5">
                {isSaved && (
                  <Alert status="success">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Имя сохранено</Alert.Title>
                    </Alert.Content>
                  </Alert>
                )}
                {generalError && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{generalError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                <TextField
                  name="name"
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    setIsSaved(false);
                  }}
                  validate={(value) =>
                    hasAttemptedSubmit ? validateName(value) : null
                  }
                  autoComplete="name"
                  isDisabled={isSubmitting}
                >
                  <Label>Имя</Label>
                  <Input placeholder="Как к вам обращаться" variant="secondary" />
                  <FieldError />
                </TextField>
              </Card.Content>

              <Card.Footer>
                <Button type="submit" size="lg" isPending={isSubmitting}>
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      Сохранить
                    </>
                  )}
                </Button>
              </Card.Footer>
            </Form>
          </Card>
        )}
      </main>
    </div>
  );
}
