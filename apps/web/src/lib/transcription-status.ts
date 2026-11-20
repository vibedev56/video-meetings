import { TranscriptionStatus } from './api';

export type StatusColor = 'default' | 'accent' | 'success' | 'danger';

export const TRANSCRIPTION_STATUS_LABELS: Record<TranscriptionStatus, string> =
  {
    [TranscriptionStatus.PENDING]: 'В очереди',
    [TranscriptionStatus.PROCESSING]: 'Транскрибация…',
    [TranscriptionStatus.COMPLETED]: 'Транскрибация готова',
    [TranscriptionStatus.FAILED]: 'Ошибка транскрибации',
  };

const TRANSCRIPTION_STATUS_COLORS: Record<TranscriptionStatus, StatusColor> = {
  [TranscriptionStatus.PENDING]: 'default',
  [TranscriptionStatus.PROCESSING]: 'accent',
  [TranscriptionStatus.COMPLETED]: 'success',
  [TranscriptionStatus.FAILED]: 'danger',
};

export function getTranscriptionLabel(status: TranscriptionStatus): string {
  return TRANSCRIPTION_STATUS_LABELS[status];
}

export function getTranscriptionColor(
  status: TranscriptionStatus,
): StatusColor {
  return TRANSCRIPTION_STATUS_COLORS[status];
}

/** A terminal status never changes again, so polling can stop. */
export function isTerminalTranscriptionStatus(
  status: TranscriptionStatus,
): boolean {
  return (
    status === TranscriptionStatus.COMPLETED ||
    status === TranscriptionStatus.FAILED
  );
}

/** True while the server is still going to change the status. */
export function isActiveTranscriptionStatus(
  status: TranscriptionStatus,
): boolean {
  return !isTerminalTranscriptionStatus(status);
}
