import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeDashboard } from './home-dashboard';
import { ApiError } from '@/lib/api';

const apiMock = vi.hoisted(() => ({
  getProfile: vi.fn(),
  listMeetings: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, ...apiMock };
});

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('./create-meeting-dialog', () => ({
  CreateMeetingDialog: () => null,
}));

function makeToken(email: string) {
  const payload = btoa(JSON.stringify({ email, sub: 1 }));
  return `header.${payload}.signature`;
}

beforeEach(() => {
  localStorage.setItem('accessToken', makeToken('ivan@example.com'));
  apiMock.getProfile.mockReset();
  apiMock.listMeetings.mockReset();
  routerMock.replace.mockReset();
  apiMock.listMeetings.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('HomeDashboard', () => {
  it('shows the name in the greeting and the header', async () => {
    apiMock.getProfile.mockResolvedValue({
      name: 'Иван Петров',
      email: 'ivan@example.com',
      hasAvatar: false,
    });

    render(<HomeDashboard />);

    expect(
      await screen.findByRole('heading', { name: /Здравствуйте, Иван Петров/ }),
    ).toBeTruthy();
    const profileLink = screen.getByRole('link', { name: /Иван Петров/ });
    expect(profileLink.getAttribute('href')).toBe('/profile');
  });

  it('falls back to the email when the name is empty', async () => {
    apiMock.getProfile.mockResolvedValue({
      name: null,
      email: 'ivan@example.com',
      hasAvatar: false,
    });

    render(<HomeDashboard />);

    expect(
      await screen.findByRole('heading', {
        name: /Здравствуйте, ivan@example.com/,
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /ivan@example.com/ })
        .getAttribute('href'),
    ).toBe('/profile');
  });

  it('redirects to login and clears the token on 401', async () => {
    apiMock.getProfile.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    render(<HomeDashboard />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('falls back to the token email when the profile request fails', async () => {
    apiMock.getProfile.mockRejectedValue(new ApiError(500, 'Server error'));

    render(<HomeDashboard />);

    expect(
      await screen.findByRole('heading', {
        name: /Здравствуйте, ivan@example.com/,
      }),
    ).toBeTruthy();
    expect(screen.queryByText('Не удалось загрузить встречи')).toBeNull();
  });
});
