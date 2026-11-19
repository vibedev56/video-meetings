import { NotFoundException } from '@nestjs/common';
import { join } from 'node:path';
import { AvatarStorage } from '../avatar.storage.js';
import { GetAvatarHandler } from './get-avatar.handler.js';
import { GetAvatarQuery } from './get-avatar.query.js';

describe('GetAvatarHandler', () => {
  const findUnique = vi.fn();
  const storage = new AvatarStorage({ get: () => '/data/avatars' } as never);
  const ensureThumbnail = vi.spyOn(storage, 'ensureThumbnail');
  const handler = new GetAvatarHandler(
    { user: { findUnique } } as never,
    storage,
  );

  it('returns the path and MIME type of the caller avatar', async () => {
    findUnique.mockResolvedValue({ avatarFile: 'a.webp' });

    const result = await handler.execute(new GetAvatarQuery('u1'));

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { avatarFile: true },
    });
    expect(result).toEqual({
      path: join('/data/avatars', 'a.webp'),
      mimeType: 'image/webp',
      etag: '"a"',
    });
  });

  it('returns the thumbnail with its own ETag when asked', async () => {
    findUnique.mockResolvedValue({ avatarFile: 'a.png' });
    ensureThumbnail.mockResolvedValue('/data/avatars/a.thumb.webp');

    const result = await handler.execute(new GetAvatarQuery('u1', true));

    expect(result).toEqual({
      path: '/data/avatars/a.thumb.webp',
      mimeType: 'image/webp',
      etag: '"a-thumb"',
    });
  });

  it('falls back to the original when the thumbnail fails', async () => {
    findUnique.mockResolvedValue({ avatarFile: 'a.png' });
    ensureThumbnail.mockRejectedValue(new Error('corrupt'));

    const result = await handler.execute(new GetAvatarQuery('u1', true));

    expect(result).toEqual({
      path: join('/data/avatars', 'a.png'),
      mimeType: 'image/png',
      etag: '"a"',
    });
  });

  it('throws 404 when there is no avatar', async () => {
    findUnique.mockResolvedValue({ avatarFile: null });

    await expect(
      handler.execute(new GetAvatarQuery('u1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws 404 when the user is gone', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      handler.execute(new GetAvatarQuery('u1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
