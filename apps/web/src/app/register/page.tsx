import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Регистрация | Видеовстречи',
  description: 'Создайте аккаунт, чтобы проводить видеовстречи.',
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
