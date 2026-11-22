import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const DAY_MS = 24 * 60 * 60 * 1000;

function makeMeeting(id: string, title: string, offsetDays: number) {
  return {
    id,
    title,
    date: new Date(Date.now() + offsetDays * DAY_MS).toISOString(),
    participants: ['a@example.com'],
  };
}

function mockProfile(name: string | null = 'Иван Петров') {
  apiMock.getProfile.mockResolvedValue({
    name,
    email: 'ivan@example.com',
    hasAvatar: false,
  });
}

describe('HomeDashboard header', () => {
  it('shows the name in the header', async () => {
    mockProfile();

    render(<HomeDashboard />);

    const profileLink = await screen.findByRole('link', {
      name: /Иван Петров/,
    });
    expect(profileLink.getAttribute('href')).toBe('/profile');
  });

  it('falls back to the email when the name is empty', async () => {
    mockProfile(null);

    render(<HomeDashboard />);

    expect(
      (
        await screen.findByRole('link', { name: /ivan@example.com/ })
      ).getAttribute('href'),
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
      await screen.findByRole('link', { name: 'Профиль: ivan@example.com' }),
    ).toBeTruthy();
    expect(screen.queryByText('Не удалось загрузить встречи')).toBeNull();
  });

  it('shows the token email in the header while the profile loads', async () => {
    apiMock.getProfile.mockReturnValue(new Promise(() => {}));

    render(<HomeDashboard />);

    expect(
      (
        await screen.findByRole('link', { name: 'Профиль: ivan@example.com' })
      ).getAttribute('href'),
    ).toBe('/profile');
  });
});

describe('HomeDashboard meetings list', () => {
  beforeEach(() => mockProfile());

  it('shows the empty state', async () => {
    render(<HomeDashboard />);

    expect(
      await screen.findByText(/Встреч пока нет. Создайте первую встречу./),
    ).toBeTruthy();
    expect(screen.getByText('Показано 0 из 0')).toBeTruthy();
  });

  it('lists meetings newest first with their state', async () => {
    apiMock.listMeetings.mockResolvedValue([
      makeMeeting('1', 'Старый синк', -7),
      makeMeeting('2', 'Будущее ретро', 7),
    ]);

    render(<HomeDashboard />);

    expect(await screen.findByText(/2 встречи · предстоящих: 1/)).toBeTruthy();
    const links = screen.getAllByRole('link', { name: /синк|ретро/ });
    // Table rows and mobile cards are both in the DOM; CSS shows one of them.
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/meetings/2',
      '/meetings/1',
      '/meetings/2',
      '/meetings/1',
    ]);
    expect(screen.getAllByText('Прошла')).toHaveLength(2);
    expect(screen.getAllByText('Запланирована')).toHaveLength(2);
    expect(screen.getByText('Показано 2 из 2')).toBeTruthy();
  });

  it('filters by tab and by title search', async () => {
    const user = userEvent.setup();
    apiMock.listMeetings.mockResolvedValue([
      makeMeeting('1', 'Старый синк', -7),
      makeMeeting('2', 'Будущее ретро', 7),
    ]);

    render(<HomeDashboard />);
    await screen.findByText(/2 встречи/);

    await user.click(screen.getByRole('tab', { name: /Предстоящие/ }));
    expect(screen.queryAllByRole('link', { name: /Старый синк/ })).toHaveLength(
      0,
    );
    expect(screen.getAllByRole('link', { name: /Будущее ретро/ })).toHaveLength(
      2,
    );
    expect(screen.getByText('Показано 1 из 2')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: /Все/ }));
    await user.type(screen.getByLabelText('Поиск по названию'), 'СИНК');
    expect(
      screen.queryAllByRole('link', { name: /Будущее ретро/ }),
    ).toHaveLength(0);
    expect(screen.getAllByRole('link', { name: /Старый синк/ })).toHaveLength(
      2,
    );

    await user.clear(screen.getByLabelText('Поиск по названию'));
    await user.type(screen.getByLabelText('Поиск по названию'), 'нет такой');
    expect(await screen.findByText(/Ничего не найдено/)).toBeTruthy();
  });
});
