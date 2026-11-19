import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvatarStorage } from '../avatar.storage.js';
import { lockUserAvatar } from '../lock-user-avatar.js';
import { DeleteAvatarCommand } from './delete-avatar.command.js';

@CommandHandler(DeleteAvatarCommand)
export class DeleteAvatarHandler implements ICommandHandler<
  DeleteAvatarCommand,
  void
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AvatarStorage,
  ) {}

  async execute(command: DeleteAvatarCommand): Promise<void> {
    const previous = await this.prisma.$transaction(async (tx) => {
      const current = await lockUserAvatar(tx, command.userId);

      if (current !== null) {
        await tx.user.update({
          where: { id: command.userId },
          data: { avatarFile: null },
        });
      }

      return current;
    });

    // The row is cleared first: a failed disk removal leaves an orphan file,
    // never a profile that points at a missing one.
    if (previous) {
      await this.storage.remove(previous);
    }
  }
}
