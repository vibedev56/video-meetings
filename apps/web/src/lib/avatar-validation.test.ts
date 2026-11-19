import { describe, expect, it } from 'vitest';
import {
  AVATAR_FILE_TOO_LARGE_MESSAGE,
  AVATAR_UNSUPPORTED_FORMAT_MESSAGE,
  MAX_AVATAR_BYTES,
  validateAvatarFile,
} from './avatar-validation';

describe('validateAvatarFile', () => {
  it.each([
    ['me.jpg', 'image/jpeg'],
    ['me.JPEG', 'image/jpeg'],
    ['me.png', 'image/png'],
    ['me.webp', 'image/webp'],
  ])('accepts %s with MIME %s', (name, type) => {
    expect(validateAvatarFile({ name, size: 1000, type })).toBeNull();
  });

  it('rejects other formats', () => {
    expect(
      validateAvatarFile({ name: 'me.gif', size: 1000, type: 'image/gif' }),
    ).toBe(AVATAR_UNSUPPORTED_FORMAT_MESSAGE);
  });

  it('rejects a MIME type that does not match the extension', () => {
    expect(
      validateAvatarFile({ name: 'me.png', size: 1000, type: 'image/jpeg' }),
    ).toBe(AVATAR_UNSUPPORTED_FORMAT_MESSAGE);
  });

  it('allows exactly 2 MB and rejects more', () => {
    const base = { name: 'me.png', type: 'image/png' };
    expect(validateAvatarFile({ ...base, size: MAX_AVATAR_BYTES })).toBeNull();
    expect(validateAvatarFile({ ...base, size: MAX_AVATAR_BYTES + 1 })).toBe(
      AVATAR_FILE_TOO_LARGE_MESSAGE,
    );
  });
});
