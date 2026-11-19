import { Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { avatarMimeType, avatarVersion } from '../avatar.policy.js';
import { AvatarStorage } from '../avatar.storage.js';
import type { AvatarFileResult } from './avatar.result.js';
import { GetAvatarQuery } from './get-avatar.query.js';

@QueryHandler(GetAvatarQuery)
export class GetAvatarHandler implements IQueryHandler<
  GetAvatarQuery,
  AvatarFileResult
> {
  private readonly logger = new Logger(GetAvatarHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AvatarStorage,
  ) {}

  async execute(query: GetAvatarQuery): Promise<AvatarFileResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: query.userId },
      select: { avatarFile: true },
    });

    if (!user?.avatarFile) {
      throw new NotFoundException('Avatar not found');
    }

    const version = avatarVersion(user.avatarFile);

    if (query.thumbnail) {
      try {
        return {
          path: await this.storage.ensureThumbnail(user.avatarFile),
          mimeType: 'image/webp',
          etag: `"${version}-thumb"`,
        };
      } catch (error) {
        // A file that cannot be resized (for example a corrupt image) is still
        // served as it is.
        this.logger.warn(`Could not make a thumbnail: ${String(error)}`);
      }
    }

    return {
      path: this.storage.pathFor(user.avatarFile),
      mimeType: avatarMimeType(user.avatarFile),
      etag: `"${version}"`,
    };
  }
}
