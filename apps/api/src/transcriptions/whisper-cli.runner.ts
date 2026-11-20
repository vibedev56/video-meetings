import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import {
  GENERIC_FAILURE_MESSAGE,
  TranscriptionFailedError,
  TranscriptionInterruptedError,
  type TranscriptionRunner,
} from './transcription.runner.js';
import { getWhisperConfig } from './transcriptions.config.js';

const STDERR_TAIL_CHARS = 2000;
const TEMP_DIR_PREFIX = 'whisper-';

/** Runs the local openai-whisper CLI. Needs `whisper` and `ffmpeg` on PATH. */
@Injectable()
export class WhisperCliRunner implements TranscriptionRunner {
  private readonly logger = new Logger(WhisperCliRunner.name);
  private child: ChildProcess | null = null;
  private stderrTail = '';
  private shuttingDown = false;

  constructor(private readonly config: ConfigService) {}

  async run(filePath: string): Promise<string> {
    const outputDir = await mkdtemp(join(tmpdir(), TEMP_DIR_PREFIX));
    try {
      await this.runWhisper(filePath, outputDir);
      return await this.readTranscript(filePath, outputDir);
    } finally {
      await rm(outputDir, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  /** Kills the running whisper process tree; used on application shutdown. */
  shutdown(): void {
    this.shuttingDown = true;
    if (this.child) this.killTree(this.child);
  }

  private buildArgs(filePath: string, model: string, outputDir: string) {
    return [
      filePath,
      '--model',
      model,
      '--output_format',
      'txt',
      '--output_dir',
      outputDir,
      '--fp16',
      'False',
    ];
  }

  private runWhisper(filePath: string, outputDir: string): Promise<void> {
    const { bin, model, timeoutMs } = getWhisperConfig(this.config);
    if (this.shuttingDown) {
      return Promise.reject(new TranscriptionInterruptedError());
    }

    return new Promise<void>((resolve, reject) => {
      const child = spawn(bin, this.buildArgs(filePath, model, outputDir), {
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
        // Own process group on POSIX, so the whole tree can be killed.
        detached: process.platform !== 'win32',
      });
      this.child = child;
      let timedOut = false;
      let settled = false;
      const timer = setTimeout(() => {
        timedOut = true;
        this.killTree(child);
      }, timeoutMs);
      const settle = (error?: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.child === child) this.child = null;
        if (error) reject(error);
        else resolve();
      };

      this.collectStderr(child);
      child.on('error', (error: NodeJS.ErrnoException) =>
        settle(this.toStartError(error)),
      );
      // `exit`, not `close`: a grandchild holding the pipe must not block us.
      child.on('exit', (code) =>
        settle(this.toExitError(code, timedOut, this.stderrTail)),
      );
    });
  }

  private collectStderr(child: ChildProcess): void {
    this.stderrTail = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      this.stderrTail = (this.stderrTail + chunk.toString()).slice(
        -STDERR_TAIL_CHARS,
      );
    });
  }

  private toStartError(error: NodeJS.ErrnoException): TranscriptionFailedError {
    this.logger.error(`Could not start whisper: ${error.message}`);
    return new TranscriptionFailedError(
      error.code === 'ENOENT'
        ? 'Whisper is not installed'
        : GENERIC_FAILURE_MESSAGE,
    );
  }

  private toExitError(
    code: number | null,
    timedOut: boolean,
    stderrTail: string,
  ): Error | undefined {
    if (this.shuttingDown) return new TranscriptionInterruptedError();
    if (timedOut)
      return new TranscriptionFailedError('Transcription timed out');
    if (code === 0) return undefined;

    this.logger.error(`whisper exited with ${code}: ${stderrTail}`);
    return new TranscriptionFailedError(GENERIC_FAILURE_MESSAGE);
  }

  /** Kills the process and its children (ffmpeg, python workers). */
  private killTree(child: ChildProcess): void {
    const { pid } = child;
    if (pid === undefined) return;
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      } else {
        process.kill(-pid, 'SIGKILL');
      }
    } catch {
      child.kill('SIGKILL');
    }
  }

  private async readTranscript(
    filePath: string,
    outputDir: string,
  ): Promise<string> {
    // whisper names the output after the input file, with a .txt extension.
    const inputName = basename(filePath, extname(filePath));
    try {
      const text = await readFile(join(outputDir, `${inputName}.txt`), 'utf8');
      return text.trim();
    } catch {
      throw new TranscriptionFailedError(GENERIC_FAILURE_MESSAGE);
    }
  }
}
