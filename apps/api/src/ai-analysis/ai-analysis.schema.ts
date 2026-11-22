import { z } from 'zod';
import { TaskStatus } from '../tasks/task-status.js';

/**
 * Flat on purpose: small models follow simple schemas better. Length limits
 * are not part of the schema (long ranges bloat the constrained-decoding
 * grammar); they are applied in code by `ai-result.normalizer.ts`.
 */
export const aiAnalysisResultSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.string()),
  tasks: z.array(
    z.object({
      title: z.string(),
      assignee: z.string().optional(),
      status: z.enum(TaskStatus).optional(),
    }),
  ),
});

export const aiSummaryResultSchema = z.object({ summary: z.string() });

export type AiAnalysisResult = z.infer<typeof aiAnalysisResultSchema>;
export type AiSummaryResult = z.infer<typeof aiSummaryResultSchema>;

/** JSON Schema sent to Ollama as `format` (constrained decoding). */
export function toOllamaFormat(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...format } = z.toJSONSchema(schema);
  return format;
}

export const ANALYSIS_FORMAT = toOllamaFormat(aiAnalysisResultSchema);
export const SUMMARY_FORMAT = toOllamaFormat(aiSummaryResultSchema);

/** Parses the model's text; `null` for anything that is not valid JSON of the schema. */
export function parseAiAnswer<T>(text: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
