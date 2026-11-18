import type { MeetingFile } from '../generated/prisma/client.js';

export interface MeetingFileResult {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: Date;
}

/** Leaves out `storedName`: clients never learn the name on disk. */
export function toMeetingFileResult(file: MeetingFile): MeetingFileResult {
  return {
    id: file.id,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
  };
}
