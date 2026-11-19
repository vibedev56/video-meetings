import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { EditProfileForm } from './edit-profile-form';

const apiMock = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, ...apiMock };
});

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

const profile = { name: 'Иван', email: 'ivan@example.com', hasAvatar: false };

beforeEach(() => {
  localStorage.setItem('accessToken', 'token-123');
  apiMock.getProfile.mockReset();
  apiMock.updateProfile.mockReset();
  routerMock.replace.mockReset();
  apiMock.getProfile.mockResolvedValue(profile);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function findInput() {
  return (await screen.findByLabelText('Имя')) as HTMLInputElement;
}

describe('EditProfileForm', () => {
  it('prefills the current name', async () => {
    render(<EditProfileForm />);

    const input = await findInput();
    expect(input.value).toBe('Иван');
  });

  it('saves the new name and shows a success message', async () => {
    apiMock.updateProfile.mockResolvedValue({ ...profile, name: 'Пётр' });
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Имя сохранено')).toBeTruthy();
    expect(apiMock.updateProfile).toHaveBeenCalledWith('token-123', 'Пётр');
  });

  it('sends an empty name to reset it', async () => {
    apiMock.updateProfile.mockResolvedValue({ ...profile, name: null });
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Имя сохранено')).toBeTruthy();
    expect(apiMock.updateProfile).toHaveBeenCalledWith('token-123', '');
  });

  it('rejects a name that is too long without calling the API', async () => {
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'а'.repeat(101) } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Имя не должно быть длиннее 100 символов'),
    ).toBeTruthy();
    expect(apiMock.updateProfile).not.toHaveBeenCalled();
  });

  it('shows an error when the API rejects the name', async () => {
    apiMock.updateProfile.mockRejectedValue(new ApiError(400, 'bad'));
    render(<EditProfileForm />);

    await findInput();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Проверьте имя и попробуйте снова.'),
    ).toBeTruthy();
  });

  it('shows a generic error on other failures', async () => {
    apiMock.updateProfile.mockRejectedValue(new ApiError(500, 'boom'));
    render(<EditProfileForm />);

    await findInput();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Не удалось сохранить имя. Попробуйте позже.'),
    ).toBeTruthy();
  });

  it('redirects to login and clears the token on 401 when saving', async () => {
    apiMock.updateProfile.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    render(<EditProfileForm />);

    await findInput();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('redirects to login without a token', async () => {
    localStorage.clear();

    render(<EditProfileForm />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(apiMock.getProfile).not.toHaveBeenCalled();
  });

  it('has a link back to the profile', async () => {
    render(<EditProfileForm />);

    await findInput();
    const link = screen.getByRole('link', { name: 'Назад к профилю' });
    expect(link.getAttribute('href')).toBe('/profile');
  });
});
