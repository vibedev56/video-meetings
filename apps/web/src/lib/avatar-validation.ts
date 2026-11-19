/**
 * Checks an avatar in the browser before it is sent. The API repeats these
 * checks and stays the authority. Mirrors `apps/api/src/avatars/avatar.policy.ts`:
 * keep the two in sync.
 */

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Allowed MIME types per extension, the same pairs the API accepts. */
const ALLOWED_TYPES = new Map<string, readonly string[]>([
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']],
  ['.webp', ['image/webp']],
]);

/** Value for the file input's `accept` attribute. */
export const ACCEPTED_AVATAR_EXTENSIONS = [...ALLOWED_TYPES.keys()];

export const AVATAR_UNSUPPORTED_FORMAT_MESSAGE =
  'Этот формат не поддерживается. Выберите изображение JPG, PNG или WebP.';

export const AVATAR_FILE_TOO_LARGE_MESSAGE =
  'Файл больше 2 МБ. Выберите изображение меньшего размера.';

export interface AvatarCandidate {
  name: string;
  size: number;
  type: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot).toLowerCase();
}

/** The Russian message for the first failed check, or `null` if the file can be sent. */
export function validateAvatarFile(file: AvatarCandidate): string | null {
  const allowed = ALLOWED_TYPES.get(extensionOf(file.name));
  if (!allowed || !allowed.includes(file.type.toLowerCase())) {
    return AVATAR_UNSUPPORTED_FORMAT_MESSAGE;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return AVATAR_FILE_TOO_LARGE_MESSAGE;
  }
  return null;
}
