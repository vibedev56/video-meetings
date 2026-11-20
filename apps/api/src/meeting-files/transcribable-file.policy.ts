import { extname } from 'node:path';

const TRANSCRIBABLE_EXTENSIONS: ReadonlySet<string> = new Set(['.mp3', '.mp4']);

/** Only mp3 and mp4 files are transcribed; other uploads have no transcription. */
export function isTranscribableFile(originalName: string): boolean {
  return TRANSCRIBABLE_EXTENSIONS.has(extname(originalName).toLowerCase());
}
