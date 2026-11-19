import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvatarStorage } from '../avatar.storage.js';
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
      // Locking the user row serializes this with uploads and other deletes,
      // so the file is removed exactly once and none is orphaned.
      const rows = await tx.$queryRaw<{ avatarFile: string | null }[]>`
        SELECT "avatarFile" FROM users WHERE id = ${command.userId}
        FOR UPDATE`;

      if (rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      if (rows[0].avatarFile !== null) {
        await tx.user.update({
          where: { id: command.userId },
          data: { avatarFile: null },
        });
      }

      return rows[0].avatarFile;
    });

    // The row is cleared first: a failed disk removal leaves an orphan file,
    // never a profile that points at a missing one.
    if (previous) {
      await this.storage.remove(previous);
    }
  }
}
