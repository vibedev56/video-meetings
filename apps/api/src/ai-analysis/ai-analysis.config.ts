import type { ConfigService } from '@nestjs/config';
import {
  CHARS_PER_TOKEN,
  DEFAULT_AI_CHUNK_CHARS,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_NUM_CTX,
  DEFAULT_AI_RUN_TIMEOUT_MS,
  DEFAULT_OLLAMA_BASE_URL,
  MIN_CHUNK_CHARS,
  RESERVED_CONTEXT_TOKENS,
} from './ai-analysis.constants.js';

export interface AiAnalysisConfig {
  baseUrl: string;
  model: string;
  numCtx: number;
  runTimeoutMs: number;
  /** Chunk size in characters, already limited to fit `numCtx`. */
  chunkChars: number;
}

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value?.trim() || undefined;

function readPositiveInt(config: ConfigService, key: string, fallback: number) {
  const value = Number(config.get<string>(key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** The largest chunk that still leaves room for the prompt and the answer. */
export function limitChunkChars(chunkChars: number, numCtx: number): number {
  const fitting = Math.floor(
    (numCtx - RESERVED_CONTEXT_TOKENS) * CHARS_PER_TOKEN,
  );
  return Math.max(MIN_CHUNK_CHARS, Math.min(chunkChars, fitting));
}

/** Reads the local model settings (Ollama); empty values count as unset. */
export function getAiAnalysisConfig(config: ConfigService): AiAnalysisConfig {
  const numCtx = readPositiveInt(config, 'AI_NUM_CTX', DEFAULT_AI_NUM_CTX);
  const chunkChars = readPositiveInt(
    config,
    'AI_CHUNK_CHARS',
    DEFAULT_AI_CHUNK_CHARS,
  );
  return {
    baseUrl: (
      emptyToUndefined(config.get<string>('OLLAMA_BASE_URL')) ??
      DEFAULT_OLLAMA_BASE_URL
    ).replace(/\/+$/, ''),
    model: emptyToUndefined(config.get<string>('AI_MODEL')) ?? DEFAULT_AI_MODEL,
    numCtx,
    runTimeoutMs: readPositiveInt(
      config,
      'AI_RUN_TIMEOUT_MS',
      DEFAULT_AI_RUN_TIMEOUT_MS,
    ),
    chunkChars: limitChunkChars(chunkChars, numCtx),
  };
}
