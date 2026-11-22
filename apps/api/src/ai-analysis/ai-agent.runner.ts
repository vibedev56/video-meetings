export const AI_AGENT_RUNNER = Symbol('AI_AGENT_RUNNER');

export interface AiAgentInput {
  meetingId: string;
  ownerId: string;
  /** Combined transcripts of all meeting files. */
  transcript: string;
  summary: string | null;
  decisions: string[];
  /** 1 on the first attempt; below 1 on a retry: the runner shrinks its chunks by this factor. */
  chunkScale?: number;
}

export interface AiAgentResult {
  /** False when the model's answer was invalid or nothing was stored. */
  meetingUpdated: boolean;
}

/** Runs one analysis pass over a meeting (the local model). Tests replace it with a fake. */
export interface AiAgentRunner {
  run(input: AiAgentInput): Promise<AiAgentResult>;
}
