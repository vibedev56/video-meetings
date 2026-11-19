import { extname, parse } from 'node:path';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Room for multipart headers and boundaries on top of the file itself. */
export const MAX_AVATAR_REQUEST_BYTES = MAX_AVATAR_BYTES + 1024 * 1024;

/** Text fields an avatar form may carry besides the file itself. */
export const MAX_AVATAR_FORM_FIELDS = 5;

/** Allowed MIME types per extension; checked as a pair. */
const ALLOWED_TYPES = new Map<string, readonly string[]>([
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']],
  ['.webp', ['image/webp']],
]);

/** MIME type to serve for a stored avatar, derived from its extension. */
export function avatarMimeType(storedName: string): string {
  return (
    ALLOWED_TYPES.get(extname(storedName).toLowerCase())?.[0] ??
    'application/octet-stream'
  );
}

export function isAllowedAvatarType(
  originalName: string,
  mimeType: string,
): boolean {
  const allowed = ALLOWED_TYPES.get(extname(originalName).toLowerCase());
  return allowed !== undefined && allowed.includes(mimeType.toLowerCase());
}

/** How many leading bytes `matchesAvatarSignature` needs to see. */
export const AVATAR_SIGNATURE_BYTES = 12;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

const startsWith = (head: Buffer, bytes: readonly number[], offset = 0) =>
  head.length >= offset + bytes.length &&
  bytes.every((byte, i) => head[offset + i] === byte);

const ascii = (text: string) => Array.from(Buffer.from(text, 'latin1'));

/**
 * True when the leading bytes of a file are the signature of the format its
 * extension claims. The extension and MIME type come from the client, so this
 * is the check that looks at the content itself.
 */
export function matchesAvatarSignature(
  fileName: string,
  head: Buffer,
): boolean {
  switch (extname(fileName).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return startsWith(head, JPEG_SIGNATURE);
    case '.png':
      return startsWith(head, PNG_SIGNATURE);
    case '.webp':
      // "RIFF", a 4-byte size, then "WEBP".
      return (
        startsWith(head, ascii('RIFF')) && startsWith(head, ascii('WEBP'), 8)
      );
    default:
      return false;
  }
}

/**
 * Version of a stored avatar. The stored name is a fresh UUID per upload, so
 * it changes exactly when the bytes do: clients can cache the image by it, and
 * it doubles as the ETag.
 */
export function avatarVersion(storedName: string): string {
  return parse(storedName).name;
}
