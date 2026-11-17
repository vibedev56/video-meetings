'use client';

import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import { useState, type SyntheticEvent } from 'react';
import { ApiError, registerUser } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const ACCESS_TOKEN_KEY = 'accessToken';

function validateEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim()) ? null : 'Введите корректный email';
}

function validatePassword(value: string) {
  return value.length >= MIN_PASSWORD_LENGTH
    ? null
    : `Пароль должен содержать не менее ${MIN_PASSWORD_LENGTH} символов`;
}

function saveAccessToken(token: string) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Registration
    // itself succeeded, so the page still shows the success state.
  }
}

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  // Client-side validation is shown only after the first submit attempt, so
  // a pristine form does not start out with error messages.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  // Field-level errors from the server, shown on the matching field.
  // HeroUI clears each one when the user edits that field.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (validateEmail(email) || validatePassword(password)) {
      return;
    }
    setGeneralError(null);
    setServerErrors({});
    setIsSubmitting(true);

    try {
      const { accessToken } = await registerUser(email.trim(), password);
      saveAccessToken(accessToken);
      setIsRegistered(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setServerErrors({ email: 'Этот email уже зарегистрирован' });
      } else if (error instanceof ApiError && error.status === 400) {
        setGeneralError(
          `Проверьте данные: email должен быть корректным, пароль — не менее ${MIN_PASSWORD_LENGTH} символов.`,
        );
      } else if (error instanceof ApiError) {
        setGeneralError('Не удалось зарегистрироваться. Попробуйте позже.');
      } else {
        setGeneralError('Сервер недоступен. Проверьте, что API запущен.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRegistered) {
    return (
      <Card className="w-full">
        <Card.Header className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-7"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <Card.Title className="text-2xl">Аккаунт создан</Card.Title>
          <Card.Description>
            Добро пожаловать! Теперь вы можете создавать и проводить
            видеовстречи.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Регистрация прошла успешно</Alert.Title>
              <Alert.Description>
                Токен доступа сохранён в этом браузере.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl shadow-indigo-500/10">
      <Card.Header className="items-center text-center">
        <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" />
            <path d="M15.5 10.5l5-3v9l-5-3" />
          </svg>
        </div>
        <Card.Title className="text-2xl">Создать аккаунт</Card.Title>
        <Card.Description>
          Введите email и пароль, чтобы начать работу с видеовстречами
        </Card.Description>
      </Card.Header>

      <Form
        onSubmit={handleSubmit}
        validationErrors={serverErrors}
        // 'aria' keeps validation messages inline under each field instead of
        // the browser's native popups, and lets the custom messages be shown.
        validationBehavior="aria"
        className="flex flex-col"
      >
        <Card.Content className="flex flex-col gap-5">
          {generalError && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{generalError}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <TextField
            isRequired
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            validate={(value) =>
              hasAttemptedSubmit ? validateEmail(value) : null
            }
            autoComplete="email"
            isDisabled={isSubmitting}
          >
            <Label>Email</Label>
            <Input placeholder="you@example.com" variant="secondary" />
            <FieldError />
          </TextField>

          <TextField
            isRequired
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
            validate={(value) =>
              hasAttemptedSubmit ? validatePassword(value) : null
            }
            autoComplete="new-password"
            isDisabled={isSubmitting}
          >
            <Label>Пароль</Label>
            <Input placeholder="Не менее 8 символов" variant="secondary" />
            <Description>Минимум {MIN_PASSWORD_LENGTH} символов</Description>
            <FieldError />
          </TextField>
        </Card.Content>

        <Card.Footer className="flex flex-col gap-3">
          <Button type="submit" fullWidth size="lg" isPending={isSubmitting}>
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                Зарегистрироваться
              </>
            )}
          </Button>
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Регистрируясь, вы соглашаетесь с условиями использования сервиса.
          </p>
        </Card.Footer>
      </Form>
    </Card>
  );
}
