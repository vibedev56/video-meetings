import {
  TranscriptionFailedError,
  type TranscriptionRunner,
} from '../../src/transcriptions/transcription.runner.js';

type Behavior = 'success' | 'failure' | 'unexpected' | 'delayed';

export const FAKE_TRANSCRIPT = 'hello from the fake whisper';
export const FAKE_FAILURE_MESSAGE = 'Whisper is not installed';

/** Test double for the whisper runner: records paths, outcome is switchable. */
export class FakeTranscriptionRunner implements TranscriptionRunner {
  behavior: Behavior = 'success';
  readonly calls: string[] = [];
  private release: (() => void) | null = null;
  private gate: Promise<void> | null = null;

  /** Makes runs wait until `releaseDelayed` is called. */
  holdRuns(): void {
    this.behavior = 'delayed';
    this.gate = new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }

  releaseDelayed(): void {
    this.release?.();
    this.behavior = 'success';
  }

  async run(filePath: string): Promise<string> {
    this.calls.push(filePath);
    if (this.behavior === 'delayed') await this.gate;
    if (this.behavior === 'failure') {
      throw new TranscriptionFailedError(FAKE_FAILURE_MESSAGE);
    }
    if (this.behavior === 'unexpected') {
      throw new Error(`boom at ${filePath}`);
    }
    return FAKE_TRANSCRIPT;
  }
}
