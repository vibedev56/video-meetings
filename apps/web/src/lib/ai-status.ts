import { AiProcessingStatus } from './api';
import type { StatusColor } from './transcription-status';

export const AI_STATUS_LABELS: Record<AiProcessingStatus, string> = {
  [AiProcessingStatus.PENDING]: 'ИИ-анализ в очереди',
  [AiProcessingStatus.IN_PROGRESS]: 'ИИ анализирует встречу…',
  [AiProcessingStatus.DONE]: 'ИИ-анализ готов',
  [AiProcessingStatus.FAILED]: 'Ошибка ИИ-анализа',
};

const AI_STATUS_COLORS: Record<AiProcessingStatus, StatusColor> = {
  [AiProcessingStatus.PENDING]: 'default',
  [AiProcessingStatus.IN_PROGRESS]: 'accent',
  [AiProcessingStatus.DONE]: 'success',
  [AiProcessingStatus.FAILED]: 'danger',
};

export const AI_UNAVAILABLE_LABEL =
  'ИИ-анализ недоступен (Ollama не запущен или модель не скачана)';

/** PENDING with a stored reason means the AI stage was skipped (Ollama unavailable). */
export function isAiSkipped(
  status: AiProcessingStatus,
  aiError: string | null,
): boolean {
  return status === AiProcessingStatus.PENDING && Boolean(aiError);
}

export function getAiStatusLabel(
  status: AiProcessingStatus,
  aiError: string | null = null,
): string {
  return isAiSkipped(status, aiError)
    ? AI_UNAVAILABLE_LABEL
    : AI_STATUS_LABELS[status];
}

export function getAiStatusColor(
  status: AiProcessingStatus,
  aiError: string | null = null,
): StatusColor {
  return isAiSkipped(status, aiError) ? 'default' : AI_STATUS_COLORS[status];
}

/** A terminal status never changes again, so polling can stop. */
export function isTerminalAiStatus(status: AiProcessingStatus): boolean {
  return (
    status === AiProcessingStatus.DONE || status === AiProcessingStatus.FAILED
  );
}

/**
 * Whether the page should keep polling the meeting. IN_PROGRESS always does.
 * PENDING only does while transcription runs (or ran on this page), because
 * the AI stage starts right after it; old meetings stay PENDING forever.
 */
export function shouldPollAiStatus(
  status: AiProcessingStatus,
  hasTranscriptionActivity: boolean,
  aiError: string | null = null,
): boolean {
  if (isAiSkipped(status, aiError)) return false;
  if (status === AiProcessingStatus.IN_PROGRESS) return true;
  return status === AiProcessingStatus.PENDING && hasTranscriptionActivity;
}
