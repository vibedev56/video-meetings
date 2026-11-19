import type { ConfigService } from '@nestjs/config';

export const DEFAULT_AVATARS_DIR = './storage/avatars';

/** Directory for user avatar files, from `AVATARS_DIR`. */
export function getAvatarsDir(config: ConfigService): string {
  return config.get<string>('AVATARS_DIR') || DEFAULT_AVATARS_DIR;
}
