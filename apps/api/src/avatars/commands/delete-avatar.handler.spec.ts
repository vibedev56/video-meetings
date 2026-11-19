import { NotFoundException } from '@nestjs/common';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AvatarStorage } from '../avatar.storage.js';
import { DeleteAvatarCommand } from './delete-avatar.command.js';
import { DeleteAvatarHandler } from './delete-avatar.handler.js';

describe('DeleteAvatarHandler', () => {
  let dir: string;
  let queryRaw: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let handler: DeleteAvatarHandler;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'avatar-delete-'));
    queryRaw = vi.fn();
    update = vi.fn();
    const config = { get: () => dir };
    handler = new DeleteAvatarHandler(
      {
        $transaction: (cb: (tx: unknown) => unknown) =>
          cb({ $queryRaw: queryRaw, user: { update } }),
      } as never,
      new AvatarStorage(config as never),
    );
  });

  it('clears the column and removes the file from disk', async () => {
    queryRaw.mockResolvedValue([{ avatarFile: 'a.png' }]);
    update.mockResolvedValue({});
    await writeFile(join(dir, 'a.png'), 'x');

    await handler.execute(new DeleteAvatarCommand('u1'));

    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { avatarFile: null },
    });
    expect(await readdir(dir)).toEqual([]);
  });

  it('succeeds without updating when there is no avatar', async () => {
    queryRaw.mockResolvedValue([{ avatarFile: null }]);

    await handler.execute(new DeleteAvatarCommand('u1'));

    expect(update).not.toHaveBeenCalled();
  });

  it('throws 404 when the user is gone', async () => {
    queryRaw.mockResolvedValue([]);

    await expect(
      handler.execute(new DeleteAvatarCommand('u1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps the file when the update fails', async () => {
    queryRaw.mockResolvedValue([{ avatarFile: 'a.png' }]);
    update.mockRejectedValue(new Error('db down'));
    await writeFile(join(dir, 'a.png'), 'x');

    await expect(
      handler.execute(new DeleteAvatarCommand('u1')),
    ).rejects.toThrow('db down');

    expect(await readdir(dir)).toEqual(['a.png']);
  });
});
