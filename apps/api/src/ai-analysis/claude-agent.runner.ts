import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingsService } from '../meetings/meetings.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import type {
  AiAgentInput,
  AiAgentResult,
  AiAgentRunner,
} from './ai-agent.runner.js';
import { createAiHooks } from './ai-hooks.js';
import {
  getAiAnalysisConfig,
  type AiAnalysisConfig,
} from './ai-analysis.config.js';
import {
  AI_EFFORT,
  AI_MCP_SERVER_NAME,
  AI_RUN_TIMEOUT_MS,
  MAX_TURNS,
  MeetingToolName,
  toMcpToolName,
} from './ai-analysis.constants.js';
import { buildUserPrompt, SYSTEM_PROMPT } from './ai-analysis.prompts.js';
import { createMeetingTools } from './meeting-tools.factory.js';

const ALLOWED_TOOLS = Object.values(MeetingToolName).map(toMcpToolName);

/** Real runner: Claude Agent SDK `query()` with three in-process MCP tools. */
@Injectable()
export class ClaudeAgentRunner implements AiAgentRunner {
  private readonly logger = new Logger('AiAgent');

  constructor(
    private readonly config: ConfigService,
    private readonly tasks: TasksService,
    private readonly meetings: MeetingsService,
  ) {}

  async run(input: AiAgentInput): Promise<AiAgentResult> {
    const settings = getAiAnalysisConfig(this.config);
    const tools = createMeetingTools({
      meetingId: input.meetingId,
      ownerId: input.ownerId,
      tasks: this.tasks,
      meetings: this.meetings,
    });
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), AI_RUN_TIMEOUT_MS);

    try {
      const stream = query({
        prompt: buildUserPrompt(input),
        options: this.buildOptions(settings, tools.server, abortController),
      });
      for await (const message of stream) {
        if (message.type !== 'result') continue;
        if (message.subtype !== 'success' || message.is_error) {
          throw new Error(`Agent finished with ${message.subtype}`);
        }
      }
    } finally {
      clearTimeout(timer);
    }
    return { meetingUpdated: tools.wasMeetingUpdated() };
  }

  private buildOptions(
    settings: AiAnalysisConfig,
    server: NonNullable<Options['mcpServers']>[string],
    abortController: AbortController,
  ): Options {
    return {
      model: settings.model,
      effort: AI_EFFORT,
      maxTurns: MAX_TURNS,
      systemPrompt: SYSTEM_PROMPT,
      // No built-in tools at all: only the three MCP tools below.
      tools: [],
      allowedTools: ALLOWED_TOOLS,
      permissionMode: 'dontAsk',
      mcpServers: { [AI_MCP_SERVER_NAME]: server },
      hooks: createAiHooks(this.logger),
      settingSources: [],
      persistSession: false,
      abortController,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: settings.apiKey,
        ANTHROPIC_AUTH_TOKEN: settings.authToken,
        ANTHROPIC_BASE_URL: settings.baseUrl,
      },
    };
  }
}
