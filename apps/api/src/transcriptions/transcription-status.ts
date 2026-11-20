import { TranscriptionStatus } from '../generated/prisma/enums.js';

export { TranscriptionStatus };

export interface TranscriptionResult {
  status: TranscriptionStatus;
  text: string | null;
  error: string | null;
}
