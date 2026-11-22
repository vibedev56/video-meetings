import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAiAnalysisConfig } from './ai-analysis.config.js';
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_MODEL_MISSING_MESSAGE,
  AI_RUNTIME_UNAVAILABLE_MESSAGE,
  AI_TEMPERATURE,
  OLLAMA_CHAT_PATH,
  OLLAMA_KEEP_ALIVE,
  OLLAMA_MODEL_NOT_FOUND_PATTERN,
} from './ai-analysis.constants.js';
import { AiRuntimeUnavailableError } from './ai-analysis.errors.js';

export interface OllamaMessage {
  role: 'system' | 'user';
  content: string;
}

export interface OllamaChatRequest {
  messages: OllamaMessage[];
  /** JSON Schema for constrained decoding. */
  format: Record<string, unknown>;
}

export interface OllamaChatResult {
  content: string;
  /** `stop`, `length` (output cut at the token limit), ... from the final chunk. */
  doneReason: string | undefined;
}

interface OllamaStreamChunk {
  message?: { content?: string };
  done?: boolean;
  done_reason?: string;
  error?: string;
}

/** Network error codes that mean "nothing is listening there". */
const UNREACHABLE_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
]);

function isUnreachable(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } }).cause;
  return Boolean(cause?.code && UNREACHABLE_CODES.has(cause.code));
}

/** Thin `fetch` wrapper over Ollama's `POST /api/chat` (no extra dependency). */
@Injectable()
export class OllamaClient {
  constructor(private readonly config: ConfigService) {}

  /**
   * Streams the answer (NDJSON), so no single response-headers or body wait
   * hits Node's 5 minute fetch timeouts on slow CPUs. Returns the joined text
   * and the final chunk's `done_reason`. Throws `AiRuntimeUnavailableError`
   * when Ollama is not reachable or the model is not pulled (HTTP 404 whose
   * body says the model was not found), and a plain `Error` for anything else
   * (timeouts, other HTTP errors, an error line inside the stream).
   */
  async chat(
    request: OllamaChatRequest,
    signal: AbortSignal,
  ): Promise<OllamaChatResult> {
    const settings = getAiAnalysisConfig(this.config);
    const response = await this.post(settings.baseUrl, signal, {
      model: settings.model,
      messages: request.messages,
      stream: true,
      format: request.format,
      keep_alive: OLLAMA_KEEP_ALIVE,
      options: {
        temperature: AI_TEMPERATURE,
        num_ctx: settings.numCtx,
        num_predict: AI_MAX_OUTPUT_TOKENS,
      },
    });
    if (!response.ok) {
      await this.throwHttpError(response, settings.model);
    }
    return this.readStream(response);
  }

  private async throwHttpError(
    response: Response,
    model: string,
  ): Promise<never> {
    if (response.status === 404) {
      const text = await response.text().catch(() => '');
      if (OLLAMA_MODEL_NOT_FOUND_PATTERN.test(text)) {
        throw new AiRuntimeUnavailableError(
          `${AI_MODEL_MISSING_MESSAGE}: ollama pull ${model}`,
        );
      }
    }
    throw new Error(`Ollama responded with HTTP ${response.status}`);
  }

  private async readStream(response: Response): Promise<OllamaChatResult> {
    const result: OllamaChatResult = { content: '', doneReason: undefined };
    if (!response.body) {
      return result;
    }
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const bytes of response.body) {
      buffer += decoder.decode(bytes, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach((line) => this.applyLine(line, result));
    }
    this.applyLine(buffer + decoder.decode(), result);
    return result;
  }

  private applyLine(line: string, result: OllamaChatResult): void {
    if (!line.trim()) {
      return;
    }
    const chunk = JSON.parse(line) as OllamaStreamChunk;
    if (chunk.error) {
      throw new Error(`Ollama stream error: ${chunk.error}`);
    }
    result.content += chunk.message?.content ?? '';
    if (chunk.done) {
      result.doneReason = chunk.done_reason;
    }
  }

  private async post(
    baseUrl: string,
    signal: AbortSignal,
    body: unknown,
  ): Promise<Response> {
    try {
      return await fetch(`${baseUrl}${OLLAMA_CHAT_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (isUnreachable(error)) {
        throw new AiRuntimeUnavailableError(AI_RUNTIME_UNAVAILABLE_MESSAGE);
      }
      throw error;
    }
  }
}
