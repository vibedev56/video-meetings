import { extname } from 'node:path';

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
