import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AVATAR_SIGNATURE_BYTES,
  matchesAvatarSignature,
} from '../avatar.policy.js';
import { AvatarStorage } from '../avatar.storage.js';
import { lockUserAvatar } from '../lock-user-avatar.js';
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
      // The extension and MIME type come from the client, so the content is
      // checked here, before the database is touched.
      const head = await this.storage.readHead(
        command.storedName,
        AVATAR_SIGNATURE_BYTES,
      );
      if (!matchesAvatarSignature(command.storedName, head)) {
        throw new BadRequestException(
          'File content does not match its format: use a real jpg, png or webp',
        );
      }

      previous = await this.prisma.$transaction(async (tx) => {
        const current = await lockUserAvatar(tx, command.userId);

        await tx.user.update({
          where: { id: command.userId },
          data: { avatarFile: command.storedName },
        });

        return current;
      });
    } catch (error) {
      // The file is already on disk, so a rejected upload must remove it.
      await this.storage.remove(command.storedName);
      throw error;
    }

    if (previous && previous !== command.storedName) {
      await this.storage.remove(previous);
    }

    return { hasAvatar: true };
  }
}
