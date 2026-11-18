import { extname } from 'node:path';

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

/** Room for multipart headers and boundaries on top of the file itself. */
export const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

export const MAX_REQUEST_BYTES = MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES;

export const MAX_FILES_PER_MEETING = 5;

/**
 * Allowed MIME types per extension. Browsers and operating systems disagree
 * on MIME types for the same format (for example m4a and mov), so the check
 * is done per pair, not per MIME type alone.
 */
const ALLOWED_TYPES = new Map<string, readonly string[]>([
  ['.mp3', ['audio/mpeg', 'audio/mp3']],
  ['.wav', ['audio/wav', 'audio/x-wav', 'audio/wave']],
  ['.m4a', ['audio/mp4', 'audio/x-m4a', 'audio/m4a']],
  ['.ogg', ['audio/ogg', 'application/ogg']],
  ['.mp4', ['video/mp4']],
  ['.webm', ['video/webm', 'audio/webm']],
  ['.mov', ['video/quicktime']],
]);

export function isAllowedMeetingFileType(
  originalName: string,
  mimeType: string,
): boolean {
  const allowedMimeTypes = ALLOWED_TYPES.get(
    extname(originalName).toLowerCase(),
  );

  return (
    allowedMimeTypes !== undefined &&
    allowedMimeTypes.includes(mimeType.toLowerCase())
  );
}

export function isWithinSizeLimit(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_BYTES;
}

/** `currentCount` is the number of files the meeting already has. */
export function canUploadMoreFiles(currentCount: number): boolean {
  return currentCount < MAX_FILES_PER_MEETING;
}

/**
 * Multipart part names arrive decoded as latin1, so UTF-8 names such as
 * Cyrillic ones come out garbled. Re-reading the bytes as UTF-8 restores them.
 */
export function decodeMultipartFilename(rawName: string): string {
  return Buffer.from(rawName, 'latin1').toString('utf8');
}
