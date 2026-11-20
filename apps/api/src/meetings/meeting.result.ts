import type { Meeting, Task } from '../generated/prisma/client.js';
import { toTaskResult, type TaskResult } from '../tasks/task.result.js';
import type { AiProcessingStatus } from './meeting-ai-status.js';

export interface MeetingResult {
  id: string;
  title: string;
  date: Date;
  participants: string[];
}

export interface MeetingDetailResult extends MeetingResult {
  summary: string | null;
  decisions: string[];
  aiStatus: AiProcessingStatus;
  aiError: string | null;
  tasks: TaskResult[];
}

export function toMeetingResult(meeting: Meeting): MeetingResult {
  return {
    id: meeting.id,
    title: meeting.title,
    date: meeting.date,
    participants: meeting.participants,
  };
}

export function toMeetingDetailResult(
  meeting: Meeting & { tasks: Task[] },
): MeetingDetailResult {
  return {
    ...toMeetingResult(meeting),
    summary: meeting.summary,
    decisions: meeting.decisions,
    aiStatus: meeting.aiStatus,
    aiError: meeting.aiError,
    tasks: meeting.tasks.map(toTaskResult),
  };
}
