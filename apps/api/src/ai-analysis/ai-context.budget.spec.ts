import {
  MAX_STATE_DECISIONS_CHARS,
  MAX_STATE_SUMMARY_CHARS,
  MIN_CHUNK_CHARS,
} from './ai-analysis.constants.js';
import {
  availableInputChars,
  compactState,
  computeChunkChars,
} from './ai-context.budget.js';

const base = { numCtx: 8192, systemPrompt: 'sys', stateText: '{}' };

describe('compactState', () => {
  it('keeps a small state unchanged', () => {
    const state = { summary: 's', decisions: ['a', 'b'] };
    expect(compactState(state)).toEqual(state);
  });

  it('cuts a huge summary and keeps only the newest decisions that fit', () => {
    const decisions = Array.from({ length: 50 }, (_, i) => `${i}`.padEnd(100));
    const result = compactState({
      summary: 'x'.repeat(MAX_STATE_SUMMARY_CHARS * 3),
      decisions,
    });
    expect(result.summary).toHaveLength(MAX_STATE_SUMMARY_CHARS);
    expect(result.decisions.join('').length).toBeLessThanOrEqual(
      MAX_STATE_DECISIONS_CHARS,
    );
    expect(result.decisions.at(-1)).toBe(decisions.at(-1));
  });
});

describe('availableInputChars', () => {
  it('shrinks as the state grows and never goes below zero', () => {
    const small = availableInputChars(base);
    const big = availableInputChars({ ...base, stateText: 'x'.repeat(3000) });
    expect(big).toBeLessThan(small);
    expect(availableInputChars({ ...base, numCtx: 100 })).toBe(0);
  });
});

describe('computeChunkChars', () => {
  const params = { ...base, configuredChunkChars: 12_000, scale: 1 };

  it('uses the configured size when the context allows it', () => {
    expect(computeChunkChars(params)).toBe(12_000);
  });

  it('shrinks by the state size so the prompt fits num_ctx', () => {
    const withState = computeChunkChars({
      ...params,
      numCtx: 4096,
      stateText: 'x'.repeat(3000),
    });
    const without = computeChunkChars({ ...params, numCtx: 4096 });
    expect(withState).toBeLessThan(without);
  });

  it('shrinks on retries but not below the minimum', () => {
    expect(computeChunkChars({ ...params, scale: 0.5 })).toBe(6000);
    expect(computeChunkChars({ ...params, scale: 0.0001 })).toBe(
      MIN_CHUNK_CHARS,
    );
  });
});
