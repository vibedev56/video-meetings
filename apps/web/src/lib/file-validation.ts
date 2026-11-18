/**
 * Checks a file in the browser before it is sent. The API repeats these checks
 * and stays the authority; this only saves a round trip and explains the
 * problem before the upload starts.
 *
 * The limits and the MIME pairs mirror `apps/api/src/meeting-files/meeting-file.policy.ts`.
 * Keep them in sync when the server list changes.
 */

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

/** Allowed MIME types per extension, the same pairs the API accepts. */
const ALLOWED_TYPES = new Map<string, readonly string[]>([
  ['.mp3', ['audio/mpeg', 'audio/mp3']],
  ['.wav', ['audio/wav', 'audio/x-wav', 'audio/wave']],
  ['.m4a', ['audio/mp4', 'audio/x-m4a', 'audio/m4a']],
  ['.ogg', ['audio/ogg', 'application/ogg']],
  ['.mp4', ['video/mp4']],
  ['.webm', ['video/webm', 'audio/webm']],
  ['.mov', ['video/quicktime']],
]);

/** Value for the file input's `accept` attribute. */
export const ACCEPTED_FILE_EXTENSIONS = [...ALLOWED_TYPES.keys()];

export const UNSUPPORTED_FORMAT_MESSAGE =
  'Этот формат не поддерживается. Выберите файл в формате mp3, wav, m4a, ogg, mp4, webm или mov.';

export const FILE_TOO_LARGE_MESSAGE =
  'Файл больше 500 МБ. Выберите файл меньшего размера.';

export interface FileCandidate {
  name: string;
  size: number;
  type: string;
}

/** Extension of `name` in lower case, including the dot (`.mp3`), or `''`. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot).toLowerCase();
}

/** True if the extension is on the list and the browser's MIME type is one of its pair. */
export function isSupportedFileType(file: FileCandidate): boolean {
  const allowedMimeTypes = ALLOWED_TYPES.get(extensionOf(file.name));
  return (
    allowedMimeTypes !== undefined &&
    allowedMimeTypes.includes(file.type.toLowerCase())
  );
}

/** True if the file is within the 500 MB limit (the limit itself is allowed). */
export function isWithinSizeLimit(file: FileCandidate): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

/**
 * Returns the Russian message for the first failed check, or `null` if the
 * file can be sent.
 */
export function validateMeetingFile(file: FileCandidate): string | null {
  if (!isSupportedFileType(file)) {
    return UNSUPPORTED_FORMAT_MESSAGE;
  }
  if (!isWithinSizeLimit(file)) {
    return FILE_TOO_LARGE_MESSAGE;
  }
  return null;
}
