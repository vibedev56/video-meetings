import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Вход | Видеовстречи',
  description: 'Войдите в аккаунт, чтобы управлять видеовстречами.',
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-indigo-50 via-white to-violet-100 px-4 py-12 dark:from-zinc-950 dark:via-zinc-950 dark:to-indigo-950">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-40 size-96 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/20"
      />

      <div className="relative w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
