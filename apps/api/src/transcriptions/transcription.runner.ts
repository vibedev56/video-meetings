/** Injection token for the `TranscriptionRunner` implementation (tests bind a fake). */
export const TRANSCRIPTION_RUNNER = Symbol('TRANSCRIPTION_RUNNER');

/** Turns an audio or video file into text. */
export interface TranscriptionRunner {
  /** Resolves with the transcript; rejects with `TranscriptionFailedError` for expected failures. */
  run(filePath: string): Promise<string>;
  /** Stops any running work; called when the application shuts down. */
  shutdown?(): void;
}

/** Carries a short message that is safe to store and show to users (no paths). */
export class TranscriptionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptionFailedError';
  }
}

/** The run was cut short by application shutdown; the job is retried on the next boot. */
export class TranscriptionInterruptedError extends Error {
  constructor() {
    super('Transcription interrupted by shutdown');
    this.name = 'TranscriptionInterruptedError';
  }
}

export const GENERIC_FAILURE_MESSAGE = 'Transcription failed';
