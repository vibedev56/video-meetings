import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';
import { AuthBrandPanel } from './auth-brand-panel';

/**
 * Page shell shared by the login and register screens. Layouts follow the
 * design frames: 1920 / 1440 / 1024 - brand panel + form; 768 - logo, form
 * card and footer; 320 - logo and the bare form.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-ds-bg lg:flex-row">
      <AuthBrandPanel />
      <div className="flex flex-1 flex-col gap-8 px-5 pt-5 pb-8 md:gap-6 md:px-10 md:py-8 lg:items-center lg:justify-center lg:p-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-start justify-center md:items-center lg:w-full lg:flex-none">
          <div className="w-full md:max-w-[480px] md:rounded-ds-xl md:border md:border-ds-line md:bg-ds-surface md:p-10 lg:max-w-[400px] lg:border-0 lg:bg-transparent lg:p-0 wide:max-w-[420px]">
            {children}
          </div>
        </div>
        <small className="hidden text-xs font-medium text-ds-muted md:block lg:hidden">
          © 2026 Видеовстречи
        </small>
      </div>
    </main>
  );
}
