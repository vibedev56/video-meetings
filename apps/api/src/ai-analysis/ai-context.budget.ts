import {
  AI_MAX_OUTPUT_TOKENS,
  CHARS_PER_TOKEN,
  MAX_STATE_DECISIONS_CHARS,
  MAX_STATE_SUMMARY_CHARS,
  MIN_CHUNK_CHARS,
  PROMPT_OVERHEAD_TOKENS,
} from './ai-analysis.constants.js';

export interface MeetingState {
  summary: string | null;
  decisions: string[];
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Keeps the previous summary and decisions small enough for any prompt: the
 * summary is cut, the newest decisions that fit are kept.
 */
export function compactState(state: MeetingState): MeetingState {
  const kept: string[] = [];
  let used = 0;
  for (const decision of [...state.decisions].reverse()) {
    if (used + decision.length > MAX_STATE_DECISIONS_CHARS) break;
    used += decision.length;
    kept.unshift(decision);
  }
  return {
    summary: state.summary?.slice(0, MAX_STATE_SUMMARY_CHARS) ?? null,
    decisions: kept,
  };
}

/** Characters of free text (transcript, partial summaries) that fit next to the fixed parts. */
export function availableInputChars(params: {
  numCtx: number;
  systemPrompt: string;
  stateText: string;
}): number {
  const tokens =
    params.numCtx -
    AI_MAX_OUTPUT_TOKENS -
    PROMPT_OVERHEAD_TOKENS -
    estimateTokens(params.systemPrompt) -
    estimateTokens(params.stateText);
  return Math.max(0, Math.floor(tokens * CHARS_PER_TOKEN));
}

/** Chunk size: the configured one, limited by the free context, scaled down on retries. */
export function computeChunkChars(params: {
  numCtx: number;
  configuredChunkChars: number;
  systemPrompt: string;
  stateText: string;
  scale: number;
}): number {
  const fitting = Math.min(
    params.configuredChunkChars,
    availableInputChars(params),
  );
  return Math.max(MIN_CHUNK_CHARS, Math.floor(fitting * params.scale));
}
