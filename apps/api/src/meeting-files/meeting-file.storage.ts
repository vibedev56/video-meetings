import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { getMeetingFilesDir } from './meeting-files.config.js';

/**
 * Owns the bytes on disk. Handlers remove the database rows and then call this
 * to remove the files they pointed to.
 */
@Injectable()
export class MeetingFileStorage {
  private readonly logger = new Logger(MeetingFileStorage.name);

  constructor(private readonly config: ConfigService) {}

  pathFor(storedName: string): string {
    // basename keeps the lookup inside the storage directory.
    return join(getMeetingFilesDir(this.config), basename(storedName));
  }

  /**
   * Missing files are ignored. Other failures are logged rather than thrown,
   * because the database rows are already gone when this runs.
   */
  async remove(storedNames: readonly string[]): Promise<void> {
    await Promise.all(
      storedNames.map((storedName) =>
        rm(this.pathFor(storedName), { force: true }).catch((error: unknown) =>
          this.logger.warn(
            `Could not remove stored file ${storedName}: ${String(error)}`,
          ),
        ),
      ),
    );
  }
}
