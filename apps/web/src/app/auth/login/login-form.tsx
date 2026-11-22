'use client';

import { Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';
import { AuthError } from '@/components/auth/auth-error';
import { AuthHeading } from '@/components/auth/auth-heading';
import { AuthSwitch } from '@/components/auth/auth-switch';
import { PasswordField } from '@/components/auth/password-field';
import { Button, TextField } from '@/components/ui';
import { ApiError, loginUser } from '@/lib/api';
import { saveAccessToken } from '@/lib/session';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim()) ? null : 'Введите корректный email';
}

function validatePassword(value: string) {
  return value.length > 0 ? null : 'Введите пароль';
}

function describeLoginError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return 'Неверный email или пароль.';
  }
  if (error instanceof ApiError && error.status === 400) {
    return 'Проверьте email и пароль.';
  }
  if (error instanceof ApiError) {
    return 'Не удалось войти. Попробуйте позже.';
  }
  return 'Сервер недоступен. Проверьте, что API запущен.';
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  // Client-side validation is shown only after the first submit attempt.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const emailError = hasAttemptedSubmit ? validateEmail(email) : null;
  const passwordError = hasAttemptedSubmit ? validatePassword(password) : null;

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
      setGeneralError(describeLoginError(error));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AuthHeading
        title="С возвращением"
        description="Войдите, чтобы открыть свои встречи, расшифровки и задачи."
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
            onChange={(event) => setEmail(event.target.value)}
            error={emailError ?? undefined}
            disabled={isSubmitting}
          />
          <PasswordField
            label="Пароль"
            required
            name="password"
            placeholder="Ваш пароль"
            autoComplete="current-password"
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
          Войти
        </Button>
      </form>

      <AuthSwitch
        question="Нет аккаунта?"
        linkLabel="Зарегистрироваться"
        href="/register"
      />
    </div>
  );
}
