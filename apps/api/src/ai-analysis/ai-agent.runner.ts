export const AI_AGENT_RUNNER = Symbol('AI_AGENT_RUNNER');

export interface AiAgentInput {
  meetingId: string;
  ownerId: string;
  /** Combined transcripts of all meeting files. */
  transcript: string;
  summary: string | null;
  decisions: string[];
}

export interface AiAgentResult {
  /** False when the agent finished without storing a summary (an invalid answer). */
  meetingUpdated: boolean;
}

/** Runs one agent pass over a meeting. Tests replace it with a fake. */
export interface AiAgentRunner {
  run(input: AiAgentInput): Promise<AiAgentResult>;
}
