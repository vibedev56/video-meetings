import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG_BYTES } from '../../../test/support/avatar-fixtures.js';
import { AvatarStorage } from '../avatar.storage.js';
import { UploadAvatarCommand } from './upload-avatar.command.js';
import { UploadAvatarHandler } from './upload-avatar.handler.js';

describe('UploadAvatarHandler', () => {
  let dir: string;
  let queryRaw: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let handler: UploadAvatarHandler;

  const put = async (name: string, content: Buffer = PNG_BYTES) => {
    await writeFile(join(dir, name), content);
    return join(dir, name);
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'avatar-handler-'));
    queryRaw = vi.fn();
    update = vi.fn();
    const config = { get: () => dir };
    handler = new UploadAvatarHandler(
      {
        $transaction: (cb: (tx: unknown) => unknown) =>
          cb({ $queryRaw: queryRaw, user: { update } }),
      } as never,
      new AvatarStorage(config as never),
    );
  });

  it('stores the new file name and removes the old file', async () => {
    queryRaw.mockResolvedValue([{ avatarFile: 'old.png' }]);
    update.mockResolvedValue({});
    await put('old.png');
    await put('new.png');

    const result = await handler.execute(
      new UploadAvatarCommand('u1', 'new.png'),
    );

    expect(result).toEqual({ hasAvatar: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { avatarFile: 'new.png' },
    });
    expect(await readdir(dir)).toEqual(['new.png']);
  });

  it('keeps the file when there was no previous avatar', async () => {
    queryRaw.mockResolvedValue([{ avatarFile: null }]);
    update.mockResolvedValue({});
    await put('new.png');

    await handler.execute(new UploadAvatarCommand('u1', 'new.png'));

    expect(await readdir(dir)).toEqual(['new.png']);
  });

  it('removes the file and skips the database when the content is not a png', async () => {
    await put('new.png', Buffer.from('<html></html>'));

    await expect(
      handler.execute(new UploadAvatarCommand('u1', 'new.png')),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(queryRaw).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(await readdir(dir)).toEqual([]);
  });

  it('removes the uploaded file and throws 404 when the user is gone', async () => {
    queryRaw.mockResolvedValue([]);
    await put('new.png');

    await expect(
      handler.execute(new UploadAvatarCommand('u1', 'new.png')),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(update).not.toHaveBeenCalled();
    expect(await readdir(dir)).toEqual([]);
  });

  it('removes the uploaded file and keeps the old one when the update fails', async () => {
    queryRaw.mockResolvedValue([{ avatarFile: 'old.png' }]);
    update.mockRejectedValue(new Error('db down'));
    await put('old.png');
    await put('new.png');

    await expect(
      handler.execute(new UploadAvatarCommand('u1', 'new.png')),
    ).rejects.toThrow('db down');

    expect(await readdir(dir)).toEqual(['old.png']);
  });
});
