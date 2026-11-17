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
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';
import { ApiError, loginUser } from '@/lib/api';
import { saveAccessToken } from '@/lib/session';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim()) ? null : 'Введите корректный email';
}

function validatePassword(value: string) {
  return value.length > 0 ? null : 'Введите пароль';
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  // Client-side validation is shown only after the first submit attempt.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (validateEmail(email) || validatePassword(password)) {
      return;
    }
    setGeneralError(null);
    setIsSubmitting(true);

    try {
      const { accessToken } = await loginUser(email.trim(), password);
      saveAccessToken(accessToken);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setGeneralError('Неверный email или пароль.');
      } else if (error instanceof ApiError && error.status === 400) {
        setGeneralError('Проверьте email и пароль.');
      } else if (error instanceof ApiError) {
        setGeneralError('Не удалось войти. Попробуйте позже.');
      } else {
        setGeneralError('Сервер недоступен. Проверьте, что API запущен.');
      }
      setIsSubmitting(false);
    }
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
        <Card.Title className="text-2xl">Вход</Card.Title>
        <Card.Description>
          Введите email и пароль, чтобы открыть свои встречи
        </Card.Description>
      </Card.Header>

      <Form
        onSubmit={handleSubmit}
        validationBehavior="aria"
        className="flex flex-col gap-6"
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
            autoComplete="current-password"
            isDisabled={isSubmitting}
          >
            <Label>Пароль</Label>
            <Input placeholder="Ваш пароль" variant="secondary" />
            <FieldError />
          </TextField>
        </Card.Content>

        <Card.Footer className="flex flex-col gap-3">
          <Button type="submit" fullWidth size="lg" isPending={isSubmitting}>
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                Войти
              </>
            )}
          </Button>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Нет аккаунта?{' '}
            <NextLink
              href="/register"
              className="inline-flex min-h-11 items-center font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
            >
              Зарегистрироваться
            </NextLink>
          </p>
        </Card.Footer>
      </Form>
    </Card>
  );
}
