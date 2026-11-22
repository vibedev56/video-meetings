import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiAgentInput,
  AiAgentResult,
  AiAgentRunner,
} from './ai-agent.runner.js';
import { getAiAnalysisConfig } from './ai-analysis.config.js';
import {
  CHUNK_OVERLAP_CHARS,
  MAX_PARTIAL_SUMMARY_CHARS,
  MIN_PARTIAL_SUMMARY_CHARS,
} from './ai-analysis.constants.js';
import { AiOutputTruncatedError } from './ai-analysis.errors.js';
import {
  availableInputChars,
  compactState,
  computeChunkChars,
  type MeetingState,
} from './ai-context.budget.js';
import {
  buildState,
  buildSummaryPrompt,
  buildUserPrompt,
  SUMMARY_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from './ai-analysis.prompts.js';
import {
  aiAnalysisResultSchema,
  aiSummaryResultSchema,
  ANALYSIS_FORMAT,
  parseAiAnswer,
  SUMMARY_FORMAT,
  type AiAnalysisResult,
} from './ai-analysis.schema.js';
import { AiResultApplier } from './ai-result.applier.js';
import { splitTranscript } from './ai-transcript.chunker.js';
import { OllamaClient } from './ollama.client.js';

/**
 * Real runner: a local model behind Ollama answers with one JSON object
 * (summary, decisions, tasks). The model has no tools; `AiResultApplier`
 * writes the validated answer. Long transcripts go through map-reduce: one
 * extraction per chunk (one after another), then one pass for the summary.
 */
@Injectable()
export class OllamaRunner implements AiAgentRunner {
  private readonly logger = new Logger('AiOllama');

  constructor(
    private readonly config: ConfigService,
    private readonly client: OllamaClient,
    private readonly applier: AiResultApplier,
  ) {}

  async run(input: AiAgentInput): Promise<AiAgentResult> {
    const settings = getAiAnalysisConfig(this.config);
    // One deadline for the whole run, including every chunk.
    const signal = AbortSignal.timeout(settings.runTimeoutMs);
    const sizing = {
      numCtx: settings.numCtx,
      configuredChunkChars: settings.chunkChars,
      systemPrompt: SYSTEM_PROMPT,
      scale: input.chunkScale ?? 1,
    };
    // The state is compacted and counted against num_ctx, so the prompt never overflows.
    const state = compactState(input);
    const stateText = buildState(state.summary, state.decisions);
    const singleLimit = computeChunkChars({ ...sizing, stateText });
    const result =
      input.transcript.length <= singleLimit
        ? await this.extract(state, input.transcript, signal)
        : await this.extractFromChunks(input, state, sizing, signal);
    if (!result) return { meetingUpdated: false };
    return { meetingUpdated: await this.applier.apply(input, result) };
  }

  /** One model call; a cut-off answer (done_reason: length) is an error, not a result. */
  private async ask(
    messages: { role: 'system' | 'user'; content: string }[],
    format: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<string> {
    const { content, doneReason } = await this.client.chat(
      { messages, format },
      signal,
    );
    if (doneReason === 'length') throw new AiOutputTruncatedError();
    return content;
  }

  private async extract(
    state: MeetingState,
    transcript: string,
    signal: AbortSignal,
  ): Promise<AiAnalysisResult | null> {
    const userPrompt = buildUserPrompt({ transcript, ...state });
    const text = await this.ask(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      ANALYSIS_FORMAT,
      signal,
    );
    const result = parseAiAnswer(text, aiAnalysisResultSchema);
    if (!result) this.logger.warn('The model returned an invalid answer');
    return result;
  }

  /** Map: extract each chunk without the current state. Reduce: merge in code, then summarize. */
  private async extractFromChunks(
    input: AiAgentInput,
    state: MeetingState,
    sizing: Omit<Parameters<typeof computeChunkChars>[0], 'stateText'>,
    signal: AbortSignal,
  ): Promise<AiAnalysisResult | null> {
    const blank: MeetingState = { summary: null, decisions: [] };
    const chunks = splitTranscript(
      input.transcript,
      computeChunkChars({ ...sizing, stateText: buildState(null, []) }),
      CHUNK_OVERLAP_CHARS,
    );
    const partials: AiAnalysisResult[] = [];
    for (const [index, chunk] of chunks.entries()) {
      this.logger.log(`Analyzing chunk ${index + 1}/${chunks.length}`);
      const partial = await this.extract(blank, chunk, signal);
      if (!partial) return null;
      partials.push(partial);
    }
    const summary = await this.summarize(
      state.summary,
      partials,
      sizing.numCtx,
      signal,
    );
    if (!summary) return null;
    return {
      summary,
      decisions: [...input.decisions, ...partials.flatMap((p) => p.decisions)],
      tasks: partials.flatMap((partial) => partial.tasks),
    };
  }

  private async summarize(
    currentSummary: string | null,
    partials: AiAnalysisResult[],
    numCtx: number,
    signal: AbortSignal,
  ): Promise<string | null> {
    // The partial summaries share what is left of the context after the state.
    const room = availableInputChars({
      numCtx,
      systemPrompt: SUMMARY_SYSTEM_PROMPT,
      stateText: buildState(currentSummary, []),
    });
    const perPartial = Math.max(
      MIN_PARTIAL_SUMMARY_CHARS,
      Math.min(MAX_PARTIAL_SUMMARY_CHARS, Math.floor(room / partials.length)),
    );
    const summaries = partials
      .map((partial) => partial.summary.trim().slice(0, perPartial))
      .filter(Boolean);
    const text = await this.ask(
      [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildSummaryPrompt(summaries, currentSummary),
        },
      ],
      SUMMARY_FORMAT,
      signal,
    );
    const result = parseAiAnswer(text, aiSummaryResultSchema);
    if (!result) this.logger.warn('The model returned an invalid summary');
    return result?.summary ?? null;
  }
}
