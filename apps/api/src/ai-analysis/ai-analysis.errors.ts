/**
 * The local model runtime cannot be used (Ollama is down or the model is not
 * pulled). Retrying will not help, so the meeting goes back to PENDING with
 * this message (safe to show to the user) instead of FAILED.
 */
export class AiRuntimeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRuntimeUnavailableError';
  }
}

/**
 * The model hit the output limit (`done_reason: length`), so its JSON is cut
 * off. Repeating the same request would fail the same way: the caller retries
 * with a smaller input instead.
 */
export class AiOutputTruncatedError extends Error {
  constructor() {
    super('The model output was truncated (done_reason: length)');
    this.name = 'AiOutputTruncatedError';
  }
}
