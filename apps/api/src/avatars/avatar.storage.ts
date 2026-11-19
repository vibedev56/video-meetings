import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rm } from 'node:fs/promises';
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
