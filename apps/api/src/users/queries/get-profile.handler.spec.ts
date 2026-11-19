import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GetProfileHandler } from './get-profile.handler.js';
import { GetProfileQuery } from './get-profile.query.js';

describe('GetProfileHandler', () => {
  const setup = (
    user: {
      email: string;
      name: string | null;
      avatarFile?: string | null;
    } | null,
  ) => {
    const findUnique = vi
      .fn()
      .mockResolvedValue(user && { avatarFile: null, ...user });
    const prisma = { user: { findUnique } } as unknown as PrismaService;
    return { handler: new GetProfileHandler(prisma), findUnique };
  };

  it('returns email, name and no avatar', async () => {
    const { handler, findUnique } = setup({ email: 'a@b.c', name: 'Анна' });

    await expect(handler.execute(new GetProfileQuery('u1'))).resolves.toEqual({
      email: 'a@b.c',
      name: 'Анна',
      hasAvatar: false,
      avatarVersion: null,
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } }),
    );
  });

  it('reports hasAvatar when an avatar file is stored', async () => {
    const { handler } = setup({
      email: 'a@b.c',
      name: null,
      avatarFile: 'x.png',
    });

    const result = await handler.execute(new GetProfileQuery('u1'));
    expect(result.hasAvatar).toBe(true);
    expect(result.avatarVersion).toBe('x');
  });

  it('returns a null name when it is not set', async () => {
    const { handler } = setup({ email: 'a@b.c', name: null });

    const result = await handler.execute(new GetProfileQuery('u1'));
    expect(result.name).toBeNull();
  });

  it('throws NotFoundException when the user does not exist', async () => {
    const { handler } = setup(null);

    await expect(handler.execute(new GetProfileQuery('u1'))).rejects.toThrow(
      NotFoundException,
    );
  });
});
