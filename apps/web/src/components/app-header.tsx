'use client';

import { CalendarDays, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { PAGE_GUTTER_CLASSES } from '@/components/page-gutter';
import {
  BurgerButton,
  IconButton,
  Logo,
  MenuButton,
  MenuItem,
  NavItem,
} from '@/components/ui';
import { UserAvatar } from '@/components/user-avatar';
import { clearAccessToken } from '@/lib/session';
import {
  clearProfileCache,
  useDisplayName,
  useProfile,
} from '@/lib/use-profile';

export type AppNavSection = 'meetings';

export interface AppHeaderProps {
  activeNav?: AppNavSection;
}

export function AppHeader({ activeNav }: AppHeaderProps) {
  const router = useRouter();
  const name = useDisplayName() ?? 'Профиль';
  const { state } = useProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!isMenuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  function handleLogout() {
    clearAccessToken();
    clearProfileCache();
    router.replace('/auth/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-ds-line bg-ds-surface">
      <div
        className={`${PAGE_GUTTER_CLASSES} flex items-center justify-between gap-4 py-3.5 lg:py-4 desktop:py-[18px]`}
      >
        <Link
          href="/"
          aria-label="Видеовстречи, на главную"
          className="shrink-0 rounded-ds-sm outline-none focus-visible:shadow-ds-ring"
        >
          <Logo />
        </Link>

        <nav aria-label="Основная навигация" className="hidden gap-1 lg:flex">
          <NavItem href="/" isActive={activeNav === 'meetings'}>
            Встречи
          </NavItem>
        </nav>

        <div className="flex min-w-0 items-center gap-2 lg:gap-3.5">
          <div className="hidden lg:block">
            <IconButton
              icon={LogOut}
              aria-label="Выйти"
              onClick={handleLogout}
            />
          </div>
          <Link
            href="/profile"
            aria-label={`Профиль: ${name}`}
            className="flex min-w-0 items-center gap-2.5 rounded-ds-xl border border-ds-line p-0.5 outline-none transition-colors hover:bg-ds-sunken focus-visible:shadow-ds-ring desktop:py-1 desktop:pr-3 desktop:pl-1"
          >
            {state.status === 'ready' ? (
              <UserAvatar profile={state.profile} size="sm" />
            ) : (
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ds-accent-soft text-xs font-bold text-ds-accent"
              >
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-48 truncate text-[13px] font-medium text-ds-ink desktop:inline">
              {name}
            </span>
          </Link>
          <BurgerButton
            isOpen={isMenuOpen}
            aria-controls={menuId}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            size="sm"
            className="lg:hidden"
          />
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id={menuId}
          aria-label="Меню"
          className="border-t border-ds-line bg-ds-surface lg:hidden"
        >
          <div className={`${PAGE_GUTTER_CLASSES} flex flex-col gap-1 py-3`}>
            <MenuItem
              href="/"
              icon={CalendarDays}
              isActive={activeNav === 'meetings'}
              onClick={() => setIsMenuOpen(false)}
            >
              Встречи
            </MenuItem>
            <MenuItem
              href="/profile"
              icon={User}
              onClick={() => setIsMenuOpen(false)}
            >
              Профиль
            </MenuItem>
            <MenuButton icon={LogOut} onClick={handleLogout}>
              Выйти
            </MenuButton>
          </div>
        </nav>
      )}
    </header>
  );
}
