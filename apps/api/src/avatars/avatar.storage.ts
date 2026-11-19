import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { access, open, rename, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import { AVATAR_THUMBNAIL_SIZE, avatarVersion } from './avatar.policy.js';
import { getAvatarsDir } from './avatars.config.js';

/** Owns avatar bytes on disk. */
@Injectable()
export class AvatarStorage {
  private readonly logger = new Logger(AvatarStorage.name);

  constructor(private readonly config: ConfigService) {}

  pathFor(storedName: string): string {
    // basename keeps the lookup inside the avatar directory.
    return join(getAvatarsDir(this.config), basename(storedName));
  }

  /** Name of the thumbnail stored next to an avatar. */
  thumbnailName(storedName: string): string {
    return `${avatarVersion(storedName)}.thumb.webp`;
  }

  /**
   * Path of the avatar thumbnail, created on first use and kept on disk. It is
   * written to a temporary name and renamed, so a parallel request never reads
   * a half-written file.
   */
  async ensureThumbnail(storedName: string): Promise<string> {
    const target = this.pathFor(this.thumbnailName(storedName));
    try {
      await access(target);
      return target;
    } catch {
      // Not created yet.
    }

    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await sharp(this.pathFor(storedName))
        .rotate()
        .resize(AVATAR_THUMBNAIL_SIZE, AVATAR_THUMBNAIL_SIZE, { fit: 'cover' })
        .webp()
        .toFile(temporary);
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
    return target;
  }

  /** Reads up to `length` leading bytes of a stored file. */
  async readHead(storedName: string, length: number): Promise<Buffer> {
    const file = await open(this.pathFor(storedName), 'r');
    try {
      const { buffer, bytesRead } = await file.read(
        Buffer.alloc(length),
        0,
        length,
        0,
      );
      return buffer.subarray(0, bytesRead);
    } finally {
      await file.close();
    }
  }

  /** Missing files are ignored; other failures are logged, not thrown. */
  async remove(storedName: string): Promise<void> {
    for (const name of [storedName, this.thumbnailName(storedName)]) {
      await rm(this.pathFor(name), { force: true }).catch((error: unknown) =>
        this.logger.warn(`Could not remove avatar ${name}: ${String(error)}`),
      );
    }
  }
}
