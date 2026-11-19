import {
  isAllowedAvatarType,
  MAX_AVATAR_BYTES,
  MAX_AVATAR_REQUEST_BYTES,
} from './avatar.policy.js';

describe('isAllowedAvatarType', () => {
  it.each([
    ['me.jpg', 'image/jpeg'],
    ['me.jpeg', 'image/jpeg'],
    ['me.JPG', 'image/JPEG'],
    ['me.png', 'image/png'],
    ['me.webp', 'image/webp'],
  ])('accepts %s as %s', (name, type) => {
    expect(isAllowedAvatarType(name, type)).toBe(true);
  });

  it.each([
    ['me.gif', 'image/gif'],
    ['me.svg', 'image/svg+xml'],
    ['me.png', 'image/jpeg'],
    ['me.png', 'text/html'],
    ['me.exe', 'image/png'],
    ['me', 'image/png'],
  ])('rejects %s as %s', (name, type) => {
    expect(isAllowedAvatarType(name, type)).toBe(false);
  });
});

describe('limits', () => {
  it('caps the avatar at 2 MB', () => {
    expect(MAX_AVATAR_BYTES).toBe(2 * 1024 * 1024);
  });

  it('allows multipart overhead on top of the file in the request limit', () => {
    expect(MAX_AVATAR_REQUEST_BYTES).toBeGreaterThan(MAX_AVATAR_BYTES);
  });
});
