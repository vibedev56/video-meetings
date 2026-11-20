import { describe, expect, it } from 'vitest';
import { AiProcessingStatus } from './api';
import {
  getAiStatusColor,
  getAiStatusLabel,
  isAiSkipped,
  isTerminalAiStatus,
  shouldPollAiStatus,
} from './ai-status';

describe('ai status helpers', () => {
  it('has a label and a color for every status', () => {
    for (const status of Object.values(AiProcessingStatus)) {
      expect(getAiStatusLabel(status)).not.toBe('');
      expect(getAiStatusColor(status)).toBeTruthy();
    }
  });

  it('marks DONE and FAILED as terminal', () => {
    expect(isTerminalAiStatus(AiProcessingStatus.DONE)).toBe(true);
    expect(isTerminalAiStatus(AiProcessingStatus.FAILED)).toBe(true);
    expect(isTerminalAiStatus(AiProcessingStatus.PENDING)).toBe(false);
    expect(isTerminalAiStatus(AiProcessingStatus.IN_PROGRESS)).toBe(false);
  });

  it('polls IN_PROGRESS always and PENDING only after transcription activity', () => {
    expect(shouldPollAiStatus(AiProcessingStatus.IN_PROGRESS, false)).toBe(
      true,
    );
    expect(shouldPollAiStatus(AiProcessingStatus.PENDING, true)).toBe(true);
    expect(shouldPollAiStatus(AiProcessingStatus.PENDING, false)).toBe(false);
    expect(shouldPollAiStatus(AiProcessingStatus.DONE, true)).toBe(false);
    expect(shouldPollAiStatus(AiProcessingStatus.FAILED, true)).toBe(false);
  });

  it('treats PENDING with a stored reason as skipped and stops polling', () => {
    expect(isAiSkipped(AiProcessingStatus.PENDING, 'x')).toBe(true);
    expect(isAiSkipped(AiProcessingStatus.PENDING, null)).toBe(false);
    expect(shouldPollAiStatus(AiProcessingStatus.PENDING, true, 'x')).toBe(
      false,
    );
    expect(getAiStatusLabel(AiProcessingStatus.PENDING, 'x')).toBe(
      'ИИ-анализ не настроен',
    );
  });
});
