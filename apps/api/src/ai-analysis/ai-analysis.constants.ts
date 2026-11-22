export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
/** Qwen3-4B-Instruct-2507, Q4_K_M (about 2.5 GB, non-thinking). */
export const DEFAULT_AI_MODEL = 'qwen3:4b-instruct-2507-q4_K_M';
export const DEFAULT_AI_NUM_CTX = 8192;
/** One whole run (all chunks) must finish within this time; CPU runs are slow. */
export const DEFAULT_AI_RUN_TIMEOUT_MS = 30 * 60 * 1000;
export const DEFAULT_AI_CHUNK_CHARS = 12_000;

export const OLLAMA_CHAT_PATH = '/api/chat';
export const OLLAMA_KEEP_ALIVE = '10m';
/** Ollama's 404 body for a missing model: `model "x" not found, try pulling it first`. */
export const OLLAMA_MODEL_NOT_FOUND_PATTERN =
  /model.*not found|not found.*model/i;
export const AI_TEMPERATURE = 0.2;
export const AI_MAX_OUTPUT_TOKENS = 2048;

/** Rough estimates used to keep a chunk inside the model context window. */
export const CHARS_PER_TOKEN = 2.5;
export const RESERVED_CONTEXT_TOKENS = 3000;
export const MIN_CHUNK_CHARS = 1000;
export const CHUNK_OVERLAP_CHARS = 500;

export const MAX_TASKS = 20;
export const MIN_TASK_TITLE_LENGTH = 3;

export const MAX_AI_ATTEMPTS = 3;
export const AI_RETRY_DELAY_MS = 2000;
/** Each retry shrinks the input: chunk size is multiplied by this factor per failed attempt. */
export const RETRY_CHUNK_SCALE = 0.5;

/** Tokens kept for prompt wrappers (tags, JSON schema hints) on top of the measured parts. */
export const PROMPT_OVERHEAD_TOKENS = 200;
/** The previous summary and decisions are compacted to this size before they enter a prompt. */
export const MAX_STATE_SUMMARY_CHARS = 2000;
export const MAX_STATE_DECISIONS_CHARS = 1000;
export const MIN_PARTIAL_SUMMARY_CHARS = 200;

/**
 * Upper cap of one run (all chunks are processed, one after another). Anything
 * beyond it is dropped, logged and reported in the meeting's aiError note.
 */
export const MAX_TRANSCRIPT_CHARS = 240_000;
export const AI_TRANSCRIPT_TRUNCATED_NOTE =
  'The transcript is too long: the tail was not analyzed';
export const MAX_SUMMARY_CHARS = 5000;
export const MAX_DECISIONS = 30;
export const MAX_DECISION_CHARS = 500;
export const MAX_PARTIAL_SUMMARY_CHARS = 1500;

export const AI_FAILURE_MESSAGE = 'AI processing failed';
export const AI_RUNTIME_UNAVAILABLE_MESSAGE =
  'Local AI model is not available (is Ollama running?)';
export const AI_MODEL_MISSING_MESSAGE = 'Local AI model is not installed';
