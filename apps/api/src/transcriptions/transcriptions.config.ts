import type { ConfigService } from '@nestjs/config';

export const DEFAULT_WHISPER_BIN = 'whisper';
/** The smallest openai-whisper model: the "low" quality, high speed option. */
export const DEFAULT_WHISPER_MODEL = 'tiny';
export const DEFAULT_WHISPER_TIMEOUT_MS = 30 * 60 * 1000;

export interface WhisperConfig {
  bin: string;
  model: string;
  timeoutMs: number;
}

export function getWhisperConfig(config: ConfigService): WhisperConfig {
  const timeoutMs = Number(config.get<string>('WHISPER_TIMEOUT_MS'));

  return {
    bin: config.get<string>('WHISPER_BIN') || DEFAULT_WHISPER_BIN,
    model: config.get<string>('WHISPER_MODEL') || DEFAULT_WHISPER_MODEL,
    timeoutMs:
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_WHISPER_TIMEOUT_MS,
  };
}
