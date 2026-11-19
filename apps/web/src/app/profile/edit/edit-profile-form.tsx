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
import { useState, type SyntheticEvent } from 'react';
import { AppShell } from '@/components/app-shell';
import { LoadError } from '@/components/load-error';
import { PageSpinner } from '@/components/page-spinner';
import { AvatarSection } from './avatar-section';
import {
  ApiError,
  changePassword,
  updateProfile,
  type ProfileResponse,
} from '@/lib/api';
import {
  redirectToLoginIfSessionInvalid,
  redirectToLoginIfUnauthorized,
  requireAccessToken,
} from '@/lib/session';
import { setCachedProfile, useProfile } from '@/lib/use-profile';

/** Mirrors `MAX_NAME_LENGTH` in the API. */
export const MAX_NAME_LENGTH = 100;

function validateName(value: string) {
  return value.trim().length > MAX_NAME_LENGTH
    ? `Имя не должно быть длиннее ${MAX_NAME_LENGTH} символов`
    : null;
}

export function EditProfileForm() {
  const { state, reload } = useProfile();

  return (
    <AppShell>
      <div className="flex flex-col gap-2">
        <Link
          href="/profile"
          className="flex min-h-11 w-fit items-center text-sm font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300"
        >
          Назад к профилю
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Редактирование профиля
        </h1>
      </div>

      {state.status === 'loading' && <PageSpinner />}
      {state.status === 'error' && (
        <LoadError title="Не удалось загрузить профиль" onRetry={reload} />
      )}
      {state.status === 'ready' && <NameSection profile={state.profile} />}
      {state.status === 'ready' && (
        <AvatarSection hasAvatar={state.profile.hasAvatar} />
      )}
      {state.status === 'ready' && <PasswordSection />}
    </AppShell>
  );
}

function NameSection({ profile }: { profile: ProfileResponse }) {
  const router = useRouter();
  const savedName = profile.name ?? '';
  // `null` means the field was not edited: it shows the saved name.
  const [draft, setDraft] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  // Validation is shown only after the first submit attempt.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const name = draft ?? savedName;
  const isChanged = name.trim() !== savedName.trim();

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (validateName(name)) {
      return;
    }

    const token = requireAccessToken(router);
    if (!token) {
      return;
    }

    setGeneralError(null);
    setIsSaved(false);
    setIsSubmitting(true);

    try {
      const updated = await updateProfile(token, name.trim());
      // Every page reads the profile from this cache, so the new name shows
      // up in the header right away.
      setCachedProfile(updated);
      setDraft(null);
      setIsSaved(true);
    } catch (error) {
      if (redirectToLoginIfSessionInvalid(error, router)) {
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
                <Alert.Description>
                  <Link
                    href="/profile"
                    className="flex min-h-11 items-center text-sm font-medium text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-300"
                  >
                    Вернуться в профиль
                  </Link>
                </Alert.Description>
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
              setDraft(value);
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
          <Button
            type="submit"
            size="lg"
            isPending={isSubmitting}
            isDisabled={!isChanged}
          >
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
  );
}

/** The API answers a wrong old password with 401 and this message. */
const WRONG_OLD_PASSWORD_MESSAGE = 'Invalid credentials';
/** The API answers a new password equal to the old one with 400 and this message. */
const SAME_PASSWORD_MESSAGE = 'New password must differ from the old password';

/** Mirror `PASSWORD_MIN_LENGTH` and `PASSWORD_MAX_LENGTH` in the API. */
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

function validateNewPassword(value: string) {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Пароль должен быть не длиннее ${MAX_PASSWORD_LENGTH} символов`;
  }
  return null;
}

function PasswordSection() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  // Validation is shown only after the first submit attempt.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setGeneralError(null);
    setIsSaved(false);
    if (validateNewPassword(newPassword)) {
      return;
    }

    const token = requireAccessToken(router);
    if (!token) {
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(token, oldPassword, newPassword);
      // The session stays valid: the token is not touched.
      setOldPassword('');
      setNewPassword('');
      // Do not validate the emptied field.
      setHasAttemptedSubmit(false);
      setIsSaved(true);
    } catch (error) {
      // A wrong old password is not a lost session; any other 401 is.
      const isWrongOldPassword =
        error instanceof ApiError &&
        error.status === 401 &&
        error.message === WRONG_OLD_PASSWORD_MESSAGE;
      if (!isWrongOldPassword && redirectToLoginIfUnauthorized(error, router)) {
        return;
      }
      if (isWrongOldPassword) {
        setGeneralError('Неверный старый пароль');
      } else if (
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === SAME_PASSWORD_MESSAGE
      ) {
        setGeneralError('Новый пароль должен отличаться от старого');
      } else if (error instanceof ApiError && error.status === 0) {
        setGeneralError('Сервер недоступен. Проверьте подключение.');
      } else {
        setGeneralError('Не удалось сменить пароль. Попробуйте позже.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-2xl">Сменить пароль</Card.Title>
        <Card.Description>
          Введите текущий пароль и придумайте новый.
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
                <Alert.Title>Пароль изменён</Alert.Title>
                <Alert.Description>
                  Вы остались в системе — входить заново не нужно.
                </Alert.Description>
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
            name="oldPassword"
            type="password"
            value={oldPassword}
            onChange={(value) => {
              setOldPassword(value);
              setIsSaved(false);
            }}
            autoComplete="current-password"
            isDisabled={isSubmitting}
          >
            <Label>Старый пароль</Label>
            <Input variant="secondary" />
            <FieldError />
          </TextField>

          <TextField
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(value) => {
              setNewPassword(value);
              setIsSaved(false);
            }}
            validate={(value) =>
              hasAttemptedSubmit ? validateNewPassword(value) : null
            }
            autoComplete="new-password"
            isDisabled={isSubmitting}
          >
            <Label>Новый пароль</Label>
            <Input variant="secondary" />
            <FieldError />
          </TextField>
        </Card.Content>

        <Card.Footer>
          <Button
            type="submit"
            size="lg"
            isPending={isSubmitting}
            isDisabled={!oldPassword || !newPassword}
          >
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                Сменить пароль
              </>
            )}
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
}
