import type { ConfigService } from '@nestjs/config';
import { DEFAULT_AVATARS_DIR, getAvatarsDir } from './avatars.config.js';

const configWith = (value?: string) => {
  const get = vi.fn().mockReturnValue(value);
  return { config: { get } as unknown as ConfigService, get };
};

describe('getAvatarsDir', () => {
  it('reads AVATARS_DIR from the config', () => {
    const { config, get } = configWith('/data/avatars');

    expect(getAvatarsDir(config)).toBe('/data/avatars');
    expect(get).toHaveBeenCalledWith('AVATARS_DIR');
  });

  it('falls back to the default when AVATARS_DIR is unset', () => {
    expect(getAvatarsDir(configWith(undefined).config)).toBe(
      DEFAULT_AVATARS_DIR,
    );
  });

  it('falls back to the default when AVATARS_DIR is empty', () => {
    expect(getAvatarsDir(configWith('').config)).toBe(DEFAULT_AVATARS_DIR);
  });

  it('defaults to a directory next to the meeting files', () => {
    expect(DEFAULT_AVATARS_DIR).toBe('./storage/avatars');
  });
});
