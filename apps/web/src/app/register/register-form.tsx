'use client';

import { Mail } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { AuthError } from '@/components/auth/auth-error';
import { AuthHeading } from '@/components/auth/auth-heading';
import { AuthSwitch } from '@/components/auth/auth-switch';
import { PasswordField } from '@/components/auth/password-field';
import { Button, TextField } from '@/components/ui';
import { ApiError, registerUser } from '@/lib/api';
import { RegisterSuccess } from './register-success';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const ACCESS_TOKEN_KEY = 'accessToken';
const EMAIL_TAKEN_MESSAGE = 'Этот email уже зарегистрирован';

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

function describeRegisterError(error: unknown) {
  if (error instanceof ApiError && error.status === 400) {
    return `Проверьте данные: email должен быть корректным, пароль — не менее ${MIN_PASSWORD_LENGTH} символов.`;
  }
  if (error instanceof ApiError) {
    return 'Не удалось зарегистрироваться. Попробуйте позже.';
  }
  return 'Сервер недоступен. Проверьте, что API запущен.';
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
  // Server-side "email taken" error; cleared as soon as the email is edited.
  const [isEmailTaken, setIsEmailTaken] = useState(false);

  const emailError = isEmailTaken
    ? EMAIL_TAKEN_MESSAGE
    : hasAttemptedSubmit
      ? validateEmail(email)
      : null;
  const passwordError = hasAttemptedSubmit ? validatePassword(password) : null;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (validateEmail(email) || validatePassword(password)) {
      return;
    }
    setGeneralError(null);
    setIsEmailTaken(false);
    setIsSubmitting(true);

    try {
      const { accessToken } = await registerUser(email.trim(), password);
      saveAccessToken(accessToken);
      setIsRegistered(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setIsEmailTaken(true);
      } else {
        setGeneralError(describeRegisterError(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRegistered) {
    return <RegisterSuccess />;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AuthHeading
        title="Создайте аккаунт"
        description="Пара секунд — и можно загружать записи встреч и получать задачи по ним."
      />

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
        {generalError && <AuthError message={generalError} />}

        <div className="flex flex-col gap-4">
          <TextField
            label="Email"
            icon={Mail}
            required
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setIsEmailTaken(false);
            }}
            error={emailError ?? undefined}
            disabled={isSubmitting}
          />
          <PasswordField
            label="Пароль"
            required
            name="password"
            placeholder="Не менее 8 символов"
            hint="Минимум 8 символов, буквы и цифры"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={passwordError ?? undefined}
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="h-12 w-full text-[15px]"
        >
          Зарегистрироваться
        </Button>
      </form>

      <AuthSwitch
        question="Уже есть аккаунт?"
        linkLabel="Войти"
        href="/auth/login"
      >
        <p className="text-center text-xs leading-normal font-medium text-ds-muted">
          Регистрируясь, вы соглашаетесь с условиями использования сервиса.
        </p>
      </AuthSwitch>
    </div>
  );
}
