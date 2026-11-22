import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Вход | Видеовстречи',
  description: 'Войдите в аккаунт, чтобы управлять видеовстречами.',
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
