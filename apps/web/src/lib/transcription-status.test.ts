import { describe, expect, it } from 'vitest';
import { TranscriptionStatus } from './api';
import {
  getTranscriptionColor,
  getTranscriptionLabel,
  isActiveTranscriptionStatus,
  isTerminalTranscriptionStatus,
} from './transcription-status';

describe('transcription status helpers', () => {
  it('has a label and a color for every status', () => {
    for (const status of Object.values(TranscriptionStatus)) {
      expect(getTranscriptionLabel(status)).not.toBe('');
      expect(getTranscriptionColor(status)).toBeTruthy();
    }
  });

  it('marks COMPLETED and FAILED as terminal', () => {
    expect(isTerminalTranscriptionStatus(TranscriptionStatus.COMPLETED)).toBe(
      true,
    );
    expect(isTerminalTranscriptionStatus(TranscriptionStatus.FAILED)).toBe(
      true,
    );
    expect(isTerminalTranscriptionStatus(TranscriptionStatus.PENDING)).toBe(
      false,
    );
    expect(isActiveTranscriptionStatus(TranscriptionStatus.PROCESSING)).toBe(
      true,
    );
  });
});
