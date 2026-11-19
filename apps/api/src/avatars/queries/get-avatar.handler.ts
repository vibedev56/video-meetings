import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { parse } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service.js';
import { avatarMimeType } from '../avatar.policy.js';
import { AvatarStorage } from '../avatar.storage.js';
import type { AvatarFileResult } from './avatar.result.js';
import { GetAvatarQuery } from './get-avatar.query.js';

@QueryHandler(GetAvatarQuery)
export class GetAvatarHandler implements IQueryHandler<
  GetAvatarQuery,
  AvatarFileResult
> {
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

    return {
      path: this.storage.pathFor(user.avatarFile),
      mimeType: avatarMimeType(user.avatarFile),
      // The stored name is a fresh UUID per upload, so it identifies the bytes.
      etag: `"${parse(user.avatarFile).name}"`,
    };
  }
}
