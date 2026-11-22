import { getAiAnalysisConfig, limitChunkChars } from './ai-analysis.config.js';

const configOf = (env: Record<string, string>) => ({
  get: (key: string) => env[key],
});

describe('getAiAnalysisConfig', () => {
  it('uses the local Qwen3 model and Ollama defaults', () => {
    expect(getAiAnalysisConfig(configOf({}) as never)).toEqual({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3:4b-instruct-2507-q4_K_M',
      numCtx: 8192,
      runTimeoutMs: 30 * 60 * 1000,
      chunkChars: 12_000,
    });
  });

  it('reads overrides, ignores empty and invalid values', () => {
    const config = getAiAnalysisConfig(
      configOf({
        AI_MODEL: 'qwen3:1.7b',
        OLLAMA_BASE_URL: 'http://host:1/',
        AI_NUM_CTX: 'abc',
        AI_RUN_TIMEOUT_MS: '',
      }) as never,
    );
    expect(config.model).toBe('qwen3:1.7b');
    expect(config.baseUrl).toBe('http://host:1');
    expect(config.numCtx).toBe(8192);
  });
});

describe('limitChunkChars', () => {
  it('shrinks a chunk that would not fit the context window', () => {
    expect(limitChunkChars(50_000, 8192)).toBeLessThan(50_000);
    expect(limitChunkChars(2000, 8192)).toBe(2000);
  });
});
