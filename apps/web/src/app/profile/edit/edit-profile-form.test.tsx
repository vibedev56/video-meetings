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
  changePassword: vi.fn(),
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
  apiMock.changePassword.mockReset();
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

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Проверьте имя и попробуйте снова.'),
    ).toBeTruthy();
  });

  it('shows a generic error on other failures', async () => {
    apiMock.updateProfile.mockRejectedValue(new ApiError(500, 'boom'));
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Не удалось сохранить имя. Попробуйте позже.'),
    ).toBeTruthy();
  });

  it('redirects to login and clears the token on 401 when saving', async () => {
    apiMock.updateProfile.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
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

  it('trims surrounding spaces before saving', async () => {
    apiMock.updateProfile.mockResolvedValue({ ...profile, name: 'Пётр' });
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: '  Пётр  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Имя сохранено')).toBeTruthy();
    expect(apiMock.updateProfile).toHaveBeenCalledWith('token-123', 'Пётр');
  });

  it('hides the success message after the name is edited again', async () => {
    apiMock.updateProfile.mockResolvedValue({ ...profile, name: 'Пётр' });
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Имя сохранено');

    fireEvent.change(input, { target: { value: 'Пётр С' } });

    expect(screen.queryByText('Имя сохранено')).toBeNull();
  });

  it('shows a connection error when the server is unreachable', async () => {
    apiMock.updateProfile.mockRejectedValue(new ApiError(0, 'network'));
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Сервер недоступен. Проверьте подключение.'),
    ).toBeTruthy();
  });

  it('shows a load error and reloads the profile on retry', async () => {
    apiMock.getProfile.mockRejectedValueOnce(new ApiError(500, 'boom'));
    render(<EditProfileForm />);

    expect(
      await screen.findByText('Не удалось загрузить профиль'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect((await findInput()).value).toBe('Иван');
    expect(apiMock.getProfile).toHaveBeenCalledTimes(2);
  });

  it('redirects to login on 401 when loading the profile', async () => {
    apiMock.getProfile.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    render(<EditProfileForm />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('accepts a name of exactly 100 characters', async () => {
    apiMock.updateProfile.mockResolvedValue({
      ...profile,
      name: 'а'.repeat(100),
    });
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'а'.repeat(100) } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Имя сохранено')).toBeTruthy();
    expect(apiMock.updateProfile).toHaveBeenCalledWith(
      'token-123',
      'а'.repeat(100),
    );
  });

  it('keeps the save button disabled until the name is changed', async () => {
    render(<EditProfileForm />);

    const input = await findInput();
    const button = screen.getByRole('button', {
      name: 'Сохранить',
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'Пётр' } });
    expect(button.disabled).toBe(false);

    fireEvent.change(input, { target: { value: 'Иван ' } });
    expect(button.disabled).toBe(true);
  });

  it('links back to the profile after saving', async () => {
    apiMock.updateProfile.mockResolvedValue({ ...profile, name: 'Пётр' });
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    const link = await screen.findByRole('link', {
      name: 'Вернуться в профиль',
    });
    expect(link.getAttribute('href')).toBe('/profile');
  });

  it('updates the name in the header after saving', async () => {
    apiMock.updateProfile.mockResolvedValue({ ...profile, name: 'Пётр' });
    render(<EditProfileForm />);

    const input = await findInput();
    expect(screen.getByRole('link', { name: 'Профиль: Иван' })).toBeTruthy();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByRole('link', { name: 'Профиль: Пётр' }),
    ).toBeTruthy();
    expect(apiMock.getProfile).toHaveBeenCalledTimes(1);
  });

  it('redirects to login on 404 when loading the profile', async () => {
    apiMock.getProfile.mockRejectedValue(new ApiError(404, 'Not found'));

    render(<EditProfileForm />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('redirects to login on 404 when saving', async () => {
    apiMock.updateProfile.mockRejectedValue(new ApiError(404, 'Not found'));
    render(<EditProfileForm />);

    const input = await findInput();
    fireEvent.change(input, { target: { value: 'Пётр' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('has a link back to the profile', async () => {
    render(<EditProfileForm />);

    await findInput();
    const link = screen.getByRole('link', { name: 'Назад к профилю' });
    expect(link.getAttribute('href')).toBe('/profile');
  });

  describe('password section', () => {
    async function findPasswordFields() {
      return {
        oldPassword: (await screen.findByLabelText(
          'Старый пароль',
        )) as HTMLInputElement,
        newPassword: (await screen.findByLabelText(
          'Новый пароль',
        )) as HTMLInputElement,
      };
    }

    it('shows password inputs for the old and the new password', async () => {
      render(<EditProfileForm />);

      const { oldPassword, newPassword } = await findPasswordFields();
      expect(
        screen.getByText('Сменить пароль', { selector: 'h3' }),
      ).toBeTruthy();
      expect(oldPassword.type).toBe('password');
      expect(newPassword.type).toBe('password');
      expect(oldPassword.autocomplete).toBe('current-password');
      expect(newPassword.autocomplete).toBe('new-password');
    });

    it('sends both passwords to the API', async () => {
      apiMock.changePassword.mockResolvedValue(null);
      render(<EditProfileForm />);

      const { oldPassword, newPassword } = await findPasswordFields();
      fireEvent.change(oldPassword, { target: { value: 'old-password' } });
      fireEvent.change(newPassword, { target: { value: 'new-password' } });
      fireEvent.click(screen.getByRole('button', { name: 'Сменить пароль' }));

      await waitFor(() =>
        expect(apiMock.changePassword).toHaveBeenCalledWith(
          'token-123',
          'old-password',
          'new-password',
        ),
      );
    });

    it('keeps the submit button disabled until both fields are filled', async () => {
      render(<EditProfileForm />);

      const { oldPassword, newPassword } = await findPasswordFields();
      const button = screen.getByRole('button', {
        name: 'Сменить пароль',
      }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      fireEvent.change(oldPassword, { target: { value: 'old-password' } });
      expect(button.disabled).toBe(true);

      fireEvent.change(newPassword, { target: { value: 'new-password' } });
      expect(button.disabled).toBe(false);
    });

    it('clears both fields after a successful change and keeps the session', async () => {
      apiMock.changePassword.mockResolvedValue(null);
      render(<EditProfileForm />);

      const { oldPassword, newPassword } = await findPasswordFields();
      fireEvent.change(oldPassword, { target: { value: 'old-password' } });
      fireEvent.change(newPassword, { target: { value: 'new-password' } });
      fireEvent.click(screen.getByRole('button', { name: 'Сменить пароль' }));

      await waitFor(() => expect(oldPassword.value).toBe(''));
      expect(newPassword.value).toBe('');
      expect(routerMock.replace).not.toHaveBeenCalled();
      expect(localStorage.getItem('accessToken')).toBe('token-123');
    });
  });
});
