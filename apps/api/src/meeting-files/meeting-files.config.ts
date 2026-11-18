import type { ConfigService } from '@nestjs/config';

export const DEFAULT_MEETING_FILES_DIR = './storage/meeting-files';

/** Directory for uploaded meeting files, from `MEETING_FILES_DIR`. */
export function getMeetingFilesDir(config: ConfigService): string {
  return config.get<string>('MEETING_FILES_DIR') || DEFAULT_MEETING_FILES_DIR;
}
