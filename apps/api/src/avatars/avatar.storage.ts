import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { open, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
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
    await rm(this.pathFor(storedName), { force: true }).catch(
      (error: unknown) =>
        this.logger.warn(
          `Could not remove avatar ${storedName}: ${String(error)}`,
        ),
    );
  }
}
