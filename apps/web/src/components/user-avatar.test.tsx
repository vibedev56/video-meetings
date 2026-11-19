import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { refreshAvatar } from '@/lib/use-avatar';
import { UserAvatar } from './user-avatar';

const apiMock = vi.hoisted(() => ({ getAvatar: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, ...apiMock };
});

const profile = { name: 'Иван Петров', email: 'ivan@example.com' };

beforeEach(() => {
  localStorage.setItem('accessToken', 'token-123');
  apiMock.getAvatar.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:avatar-1');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('UserAvatar', () => {
  it('shows initials without an avatar and does not fetch', () => {
    render(<UserAvatar profile={{ ...profile, hasAvatar: false }} />);

    expect(screen.getByText('ИП')).toBeTruthy();
    expect(apiMock.getAvatar).not.toHaveBeenCalled();
  });

  it('shows the image when the profile has an avatar', async () => {
    apiMock.getAvatar.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));

    const { container } = render(
      <UserAvatar profile={{ ...profile, hasAvatar: true }} />,
    );

    await waitFor(() =>
      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        'blob:avatar-1',
      ),
    );
    expect(apiMock.getAvatar).toHaveBeenCalledWith('token-123');
  });

  it('keeps the initials when loading the image fails', async () => {
    apiMock.getAvatar.mockRejectedValue(new ApiError(500, 'boom'));

    const { container } = render(
      <UserAvatar profile={{ ...profile, hasAvatar: true }} />,
    );

    await waitFor(() => expect(apiMock.getAvatar).toHaveBeenCalled());
    expect(screen.getByText('ИП')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shares one request between several avatars', async () => {
    apiMock.getAvatar.mockResolvedValue(new Blob(['x']));

    const { container } = render(
      <>
        <UserAvatar profile={{ ...profile, hasAvatar: true }} />
        <UserAvatar profile={{ ...profile, hasAvatar: true }} />
      </>,
    );

    await waitFor(() =>
      expect(container.querySelectorAll('img')).toHaveLength(2),
    );
    expect(apiMock.getAvatar).toHaveBeenCalledTimes(1);
  });

  it('reloads the image after refreshAvatar (replaced avatar)', async () => {
    apiMock.getAvatar.mockResolvedValue(new Blob(['x']));
    const { container } = render(
      <UserAvatar profile={{ ...profile, hasAvatar: true }} />,
    );
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    URL.createObjectURL = vi.fn(() => 'blob:avatar-2');
    refreshAvatar();

    await waitFor(() =>
      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        'blob:avatar-2',
      ),
    );
    expect(apiMock.getAvatar).toHaveBeenCalledTimes(2);
  });
});
