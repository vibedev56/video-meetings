import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { ProfileView } from './profile-view';

const apiMock = vi.hoisted(() => ({ getProfile: vi.fn() }));
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, ...apiMock };
});

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

beforeEach(() => {
  localStorage.setItem('accessToken', 'token-123');
  apiMock.getProfile.mockReset();
  routerMock.replace.mockReset();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('ProfileView', () => {
  it('shows the name, email and initials', async () => {
    apiMock.getProfile.mockResolvedValue({
      name: 'Иван Петров',
      email: 'ivan@example.com',
      hasAvatar: false,
    });

    render(<ProfileView />);

    expect(
      await screen.findByRole('heading', { name: 'Иван Петров' }),
    ).toBeTruthy();
    expect(screen.getByText('ivan@example.com')).toBeTruthy();
    expect(screen.getByText('ИП')).toBeTruthy();
    expect(apiMock.getProfile).toHaveBeenCalledWith('token-123');
  });

  it('links to the edit page', async () => {
    apiMock.getProfile.mockResolvedValue({
      name: null,
      email: 'ivan@example.com',
      hasAvatar: false,
    });

    render(<ProfileView />);

    const link = await screen.findByRole('link', { name: 'Изменить имя' });
    expect(link.getAttribute('href')).toBe('/profile/edit');
  });

  it('shows the email as the heading when the name is empty', async () => {
    apiMock.getProfile.mockResolvedValue({
      name: null,
      email: 'ivan@example.com',
      hasAvatar: false,
    });

    render(<ProfileView />);

    expect(
      await screen.findByRole('heading', { name: 'ivan@example.com' }),
    ).toBeTruthy();
    expect(screen.getByText('I')).toBeTruthy();
  });

  it('redirects to login without a token', async () => {
    localStorage.clear();

    render(<ProfileView />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(apiMock.getProfile).not.toHaveBeenCalled();
  });

  it('redirects to login and clears the token on 401', async () => {
    apiMock.getProfile.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    render(<ProfileView />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('shows an error with a retry button on other failures', async () => {
    apiMock.getProfile.mockRejectedValue(new ApiError(500, 'boom'));

    render(<ProfileView />);

    expect(
      await screen.findByText('Не удалось загрузить профиль'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
  });
});
