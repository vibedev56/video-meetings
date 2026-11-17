import type { Meeting } from '../generated/prisma/client.js';

export interface MeetingResult {
  id: string;
  title: string;
  date: Date;
  participants: string[];
}

export function toMeetingResult(meeting: Meeting): MeetingResult {
  return {
    id: meeting.id,
    title: meeting.title,
    date: meeting.date,
    participants: meeting.participants,
  };
}
