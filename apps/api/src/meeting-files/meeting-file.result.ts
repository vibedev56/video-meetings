import type { MeetingFile } from '../generated/prisma/client.js';
import { TranscriptionStatus } from '../generated/prisma/enums.js';
import { isTranscribableFile } from './transcribable-file.policy.js';

/** Status of a file's transcription, as shown next to the file. */
export interface TranscriptionSummaryResult {
  status: TranscriptionStatus;
  error: string | null;
}

export interface MeetingFileResult {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: Date;
  /** `null` for files that are not transcribed (anything but mp3 and mp4). */
  transcription: TranscriptionSummaryResult | null;
}

/** Leaves out `storedName`: clients never learn the name on disk. */
export function toMeetingFileResult(
  file: MeetingFile,
  transcription: TranscriptionSummaryResult | null,
): MeetingFileResult {
  // A transcribable file whose row is not visible yet is still waiting, so a
  // client never sees its status disappear.
  const summary =
    transcription ??
    (isTranscribableFile(file.originalName)
      ? { status: TranscriptionStatus.PENDING, error: null }
      : null);

  return {
    id: file.id,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
    transcription: summary,
  };
}

/** What the download response needs. `path` stays on the server; the controller never sends it. */
export interface MeetingFileDownloadResult {
  path: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}
