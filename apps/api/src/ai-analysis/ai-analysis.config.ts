import type { ConfigService } from '@nestjs/config';
import { DEFAULT_AI_MODEL } from './ai-analysis.constants.js';

export interface AiAnalysisConfig {
  apiKey: string | undefined;
  authToken: string | undefined;
  baseUrl: string | undefined;
  model: string;
}

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value?.trim() || undefined;

/** Reads the ANTHROPIC_* variables; empty values count as unset. */
export function getAiAnalysisConfig(config: ConfigService): AiAnalysisConfig {
  return {
    apiKey: emptyToUndefined(config.get<string>('ANTHROPIC_API_KEY')),
    authToken: emptyToUndefined(config.get<string>('ANTHROPIC_AUTH_TOKEN')),
    baseUrl: emptyToUndefined(config.get<string>('ANTHROPIC_BASE_URL')),
    model: emptyToUndefined(config.get<string>('AI_MODEL')) ?? DEFAULT_AI_MODEL,
  };
}

export function isAiConfigured(config: AiAnalysisConfig): boolean {
  return Boolean(config.apiKey || config.authToken);
}
