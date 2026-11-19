import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  AVATAR_FILE_TOO_LARGE_MESSAGE,
  AVATAR_UNSUPPORTED_FORMAT_MESSAGE,
  MAX_AVATAR_BYTES,
} from '@/lib/avatar-validation';
import { EditProfileForm } from './edit-profile-form';

const apiMock = vi.hoisted(() => ({
  getProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
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
  apiMock.uploadAvatar.mockReset();
  apiMock.deleteAvatar.mockReset();
  routerMock.replace.mockReset();
  apiMock.getProfile.mockResolvedValue(profile);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function findFileInput() {
  return (await screen.findByLabelText('Файл аватара')) as HTMLInputElement;
}

function pick(input: HTMLInputElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } });
}

const png = () => new File(['x'], 'me.png', { type: 'image/png' });

describe('avatar section', () => {
  it('shows the allowed formats and size', async () => {
    render(<EditProfileForm />);

    await findFileInput();
    expect(screen.getByText(/JPG, PNG или WebP, до 2 МБ/)).toBeTruthy();
  });

  it('only offers image files in the picker', async () => {
    render(<EditProfileForm />);

    const input = await findFileInput();
    expect(input.accept).toBe('.jpg,.jpeg,.png,.webp');
  });

  it('uploads a valid file and shows a success message', async () => {
    apiMock.uploadAvatar.mockResolvedValue({ hasAvatar: true });
    render(<EditProfileForm />);

    const file = png();
    pick(await findFileInput(), file);

    expect(await screen.findByText('Аватар обновлён')).toBeTruthy();
    expect(apiMock.uploadAvatar).toHaveBeenCalledWith('token-123', file);
  });

  it('rejects an unsupported format without calling the API', async () => {
    render(<EditProfileForm />);

    pick(
      await findFileInput(),
      new File(['x'], 'me.gif', { type: 'image/gif' }),
    );

    expect(
      await screen.findByText(AVATAR_UNSUPPORTED_FORMAT_MESSAGE),
    ).toBeTruthy();
    expect(apiMock.uploadAvatar).not.toHaveBeenCalled();
  });

  it('rejects a file over 2 MB without calling the API', async () => {
    render(<EditProfileForm />);

    const big = png();
    Object.defineProperty(big, 'size', { value: MAX_AVATAR_BYTES + 1 });
    pick(await findFileInput(), big);

    expect(await screen.findByText(AVATAR_FILE_TOO_LARGE_MESSAGE)).toBeTruthy();
    expect(apiMock.uploadAvatar).not.toHaveBeenCalled();
  });

  it('clears an earlier error after a valid upload', async () => {
    apiMock.uploadAvatar.mockResolvedValue({ hasAvatar: true });
    render(<EditProfileForm />);

    const input = await findFileInput();
    pick(input, new File(['x'], 'me.gif', { type: 'image/gif' }));
    await screen.findByText(AVATAR_UNSUPPORTED_FORMAT_MESSAGE);
    pick(input, png());

    expect(await screen.findByText('Аватар обновлён')).toBeTruthy();
    expect(screen.queryByText(AVATAR_UNSUPPORTED_FORMAT_MESSAGE)).toBeNull();
  });

  it.each([
    [400, 'Сервер не принял файл. Проверьте формат и размер.'],
    [413, AVATAR_FILE_TOO_LARGE_MESSAGE],
    [415, AVATAR_UNSUPPORTED_FORMAT_MESSAGE],
    [500, 'Не удалось загрузить аватар. Попробуйте позже.'],
    [0, 'Сервер недоступен. Проверьте подключение.'],
  ])('maps server status %i to a message', async (status, message) => {
    apiMock.uploadAvatar.mockRejectedValue(new ApiError(status, 'err'));
    render(<EditProfileForm />);

    pick(await findFileInput(), png());

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText('Аватар обновлён')).toBeNull();
  });

  it('redirects to login and clears the token on 401', async () => {
    apiMock.uploadAvatar.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    render(<EditProfileForm />);

    pick(await findFileInput(), png());

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('marks the cached profile as having an avatar after upload', async () => {
    apiMock.uploadAvatar.mockResolvedValue({ hasAvatar: true });
    render(<EditProfileForm />);

    pick(await findFileInput(), png());
    await screen.findByText('Аватар обновлён');

    // Remounting reads the shared cache instead of fetching again.
    cleanup();
    apiMock.getProfile.mockClear();
    render(<EditProfileForm />);
    await findFileInput();
    expect(apiMock.getProfile).not.toHaveBeenCalled();
  });
});

describe('avatar deletion', () => {
  const withAvatar = { ...profile, hasAvatar: true };
  const deleteButton = () =>
    screen.queryByRole('button', { name: 'Удалить аватар' });

  async function clickDelete() {
    fireEvent.click(
      await screen.findByRole('button', { name: 'Удалить аватар' }),
    );
  }

  it('hides the delete button when there is no avatar', async () => {
    render(<EditProfileForm />);

    await findFileInput();
    expect(deleteButton()).toBeNull();
  });

  it('deletes the avatar and shows a success message', async () => {
    apiMock.getProfile.mockResolvedValue(withAvatar);
    apiMock.deleteAvatar.mockResolvedValue(null);
    render(<EditProfileForm />);

    await clickDelete();

    expect(await screen.findByText('Аватар удалён')).toBeTruthy();
    expect(apiMock.deleteAvatar).toHaveBeenCalledWith('token-123');
    await waitFor(() => expect(deleteButton()).toBeNull());
  });

  it('offers deletion after a fresh upload', async () => {
    apiMock.uploadAvatar.mockResolvedValue({ hasAvatar: true });
    render(<EditProfileForm />);

    pick(await findFileInput(), png());

    expect(
      await screen.findByRole('button', { name: 'Удалить аватар' }),
    ).toBeTruthy();
  });

  it('marks the cached profile as having no avatar', async () => {
    apiMock.getProfile.mockResolvedValue(withAvatar);
    apiMock.deleteAvatar.mockResolvedValue(null);
    render(<EditProfileForm />);
    await clickDelete();
    await screen.findByText('Аватар удалён');

    cleanup();
    apiMock.getProfile.mockClear();
    render(<EditProfileForm />);
    await findFileInput();
    expect(apiMock.getProfile).not.toHaveBeenCalled();
    expect(deleteButton()).toBeNull();
  });

  it.each([
    [0, 'Сервер недоступен. Проверьте подключение.'],
    [500, 'Не удалось удалить аватар. Попробуйте позже.'],
  ])('maps delete status %i to a message', async (status, message) => {
    apiMock.getProfile.mockResolvedValue(withAvatar);
    apiMock.deleteAvatar.mockRejectedValue(new ApiError(status, 'err'));
    render(<EditProfileForm />);

    await clickDelete();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(deleteButton()).toBeTruthy();
  });

  it('blocks the file input while the deletion is pending', async () => {
    apiMock.getProfile.mockResolvedValue(withAvatar);
    apiMock.deleteAvatar.mockReturnValue(new Promise(() => {}));
    render(<EditProfileForm />);

    await clickDelete();

    await waitFor(async () =>
      expect((await findFileInput()).disabled).toBe(true),
    );
  });

  it('redirects to login and clears the token on 401', async () => {
    apiMock.getProfile.mockResolvedValue(withAvatar);
    apiMock.deleteAvatar.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    render(<EditProfileForm />);

    await clickDelete();

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
