import {
  avatarMimeType,
  avatarVersion,
  matchesAvatarSignature,
  isAllowedAvatarType,
  MAX_AVATAR_BYTES,
  MAX_AVATAR_REQUEST_BYTES,
} from './avatar.policy.js';

describe('avatarMimeType', () => {
  it.each([
    ['a.jpg', 'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.PNG', 'image/png'],
    ['a.webp', 'image/webp'],
    ['a.bin', 'application/octet-stream'],
  ])('maps %s to %s', (name, type) => {
    expect(avatarMimeType(name)).toBe(type);
  });
});

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

describe('matchesAvatarSignature', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const webp = Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 ', 'latin1');

  it.each([
    ['a.png', png],
    ['a.PNG', png],
    ['a.jpg', jpeg],
    ['a.jpeg', jpeg],
    ['a.webp', webp],
  ])('accepts a real %s', (name, head) => {
    expect(matchesAvatarSignature(name, head)).toBe(true);
  });

  it.each([
    ['a.png', jpeg],
    ['a.jpg', png],
    ['a.webp', png],
    ['a.png', Buffer.from('fake image')],
    ['a.png', Buffer.alloc(0)],
    ['a.png', png.subarray(0, 4)],
    ['a.webp', Buffer.from('RIFF\x10\x00\x00\x00WAVEfmt ', 'latin1')],
    ['a.gif', Buffer.from('GIF89a')],
  ])('rejects %s with other content', (name, head) => {
    expect(matchesAvatarSignature(name, head)).toBe(false);
  });
});

describe('avatarVersion', () => {
  it('is the stored name without its extension', () => {
    expect(avatarVersion('3f2a-uuid.png')).toBe('3f2a-uuid');
  });
});
