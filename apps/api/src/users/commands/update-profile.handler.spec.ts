import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateProfileCommand } from './update-profile.command.js';
import { UpdateProfileHandler } from './update-profile.handler.js';

describe('UpdateProfileHandler', () => {
  const setup = (update: ReturnType<typeof vi.fn>) => {
    const prisma = { user: { update } } as unknown as PrismaService;
    return new UpdateProfileHandler(prisma);
  };

  const ok = (name: string | null, avatarFile: string | null = null) =>
    vi.fn().mockResolvedValue({ email: 'a@b.c', name, avatarFile });

  it('trims the name and updates only the given user', async () => {
    const update = ok('Анна');
    const result = await setup(update).execute(
      new UpdateProfileCommand('u1', '  Анна  '),
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: { name: 'Анна' } }),
    );
    expect(result).toEqual({ email: 'a@b.c', name: 'Анна', hasAvatar: false });
  });

  it('reports hasAvatar when an avatar file is stored', async () => {
    const result = await setup(ok('Анна', 'x.png')).execute(
      new UpdateProfileCommand('u1', 'Анна'),
    );

    expect(result.hasAvatar).toBe(true);
  });

  it.each(['', '   ', '\t\n'])('resets the name for %j', async (input) => {
    const update = ok(null);
    const result = await setup(update).execute(
      new UpdateProfileCommand('u1', input),
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: null } }),
    );
    expect(result.name).toBeNull();
  });

  it('throws NotFoundException when the user no longer exists', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('missing', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const handler = setup(vi.fn().mockRejectedValue(error));

    await expect(
      handler.execute(new UpdateProfileCommand('u1', 'Анна')),
    ).rejects.toThrow(NotFoundException);
  });

  it('rethrows unexpected errors', async () => {
    const handler = setup(vi.fn().mockRejectedValue(new Error('db down')));

    await expect(
      handler.execute(new UpdateProfileCommand('u1', 'Анна')),
    ).rejects.toThrow('db down');
  });
});
