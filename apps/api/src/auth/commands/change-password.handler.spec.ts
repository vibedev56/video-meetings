import { UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { hashPassword } from '../password.js';
import { ChangePasswordCommand } from './change-password.command.js';
import { ChangePasswordHandler } from './change-password.handler.js';

describe('ChangePasswordHandler', () => {
  const OLD = 'old-password-123';
  const NEW = 'new-password-456';

  const setup = (credentials: { id: string; passwordHash: string } | null) => {
    const queryBus = {
      execute: vi.fn().mockResolvedValue(credentials),
    } as unknown as QueryBus;
    const send = vi.fn().mockResolvedValue(undefined);
    const commandBus = { execute: send } as unknown as CommandBus;
    return {
      handler: new ChangePasswordHandler(commandBus, queryBus),
      send,
    };
  };

  it('stores a hash of the new password when the old one matches', async () => {
    const { handler, send } = setup({
      id: 'u1',
      passwordHash: await hashPassword(OLD),
    });

    await handler.execute(new ChangePasswordCommand('u1', OLD, NEW));

    const sent = send.mock.calls[0][0] as {
      userId: string;
      passwordHash: string;
    };
    expect(sent.userId).toBe('u1');
    expect(sent.passwordHash).not.toBe(NEW);
    expect(sent.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('throws UnauthorizedException when the old password is wrong', async () => {
    const { handler, send } = setup({
      id: 'u1',
      passwordHash: await hashPassword(OLD),
    });

    await expect(
      handler.execute(new ChangePasswordCommand('u1', 'wrong', NEW)),
    ).rejects.toThrow(UnauthorizedException);
    expect(send).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the user no longer exists', async () => {
    const { handler } = setup(null);

    await expect(
      handler.execute(new ChangePasswordCommand('u1', OLD, NEW)),
    ).rejects.toThrow(UnauthorizedException);
  });
});
