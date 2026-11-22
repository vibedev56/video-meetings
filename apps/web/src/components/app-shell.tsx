import type { ReactNode } from 'react';
import { classNames } from '@/lib/class-names';
import { AppHeader, type AppNavSection } from './app-header';

const NARROW_CONTENT_CLASSES = 'max-w-3xl gap-6 px-4 py-8';
const WIDE_CONTENT_CLASSES =
  'gap-5 pt-6 pb-10 md:gap-6 md:pt-8 md:pb-12 lg:pt-10 lg:pb-14 desktop:pb-16 wide:pt-12 wide:pb-[72px] px-4 md:px-6 lg:px-8 desktop:px-16 wide:px-60';

export interface AppShellProps {
  children: ReactNode;
  /** `wide` follows the list layouts of the design; `narrow` is a reading column. */
  width?: 'narrow' | 'wide';
  /** The nav item to mark as the current page. */
  activeNav?: AppNavSection;
}

/** Page frame for signed-in pages: background, header and the content column. */
export function AppShell({
  children,
  width = 'narrow',
  activeNav,
}: AppShellProps) {
  const isWide = width === 'wide';
  return (
    <div className="flex min-h-dvh flex-col bg-ds-bg">
      <AppHeader activeNav={activeNav} />
      <main
        className={classNames(
          'mx-auto flex w-full flex-1 flex-col',
          isWide ? 'max-w-[1920px]' : '',
          isWide ? WIDE_CONTENT_CLASSES : NARROW_CONTENT_CLASSES,
        )}
      >
        {children}
      </main>
    </div>
  );
}
