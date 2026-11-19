import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { rm } from 'node:fs/promises';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvatarStorage } from '../avatar.storage.js';
import { UploadAvatarCommand } from './upload-avatar.command.js';

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler implements ICommandHandler<
  UploadAvatarCommand,
  { hasAvatar: true }
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AvatarStorage,
  ) {}

  async execute(command: UploadAvatarCommand): Promise<{ hasAvatar: true }> {
    let previous: string | null;

    try {
      previous = await this.prisma.$transaction(async (tx) => {
        // Locking the user row serializes concurrent uploads, so each old
        // file is removed exactly once and none is orphaned.
        const rows = await tx.$queryRaw<{ avatarFile: string | null }[]>`
          SELECT "avatarFile" FROM users WHERE id = ${command.userId}
          FOR UPDATE`;

        if (rows.length === 0) {
          throw new NotFoundException('User not found');
        }

        await tx.user.update({
          where: { id: command.userId },
          data: { avatarFile: command.storedName },
        });

        return rows[0].avatarFile;
      });
    } catch (error) {
      // The file is already on disk, so a rejected upload must remove it.
      await rm(command.filePath, { force: true }).catch(() => undefined);
      throw error;
    }

    if (previous && previous !== command.storedName) {
      await this.storage.remove(previous);
    }

    return { hasAvatar: true };
  }
}
