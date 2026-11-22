import type { MeetingResponse } from '@/lib/api';

export enum MeetingFilter {
  ALL = 'ALL',
  UPCOMING = 'UPCOMING',
  PAST = 'PAST',
}

export function isPastMeeting(meeting: MeetingResponse, now: number): boolean {
  return new Date(meeting.date).getTime() < now;
}

/** Newest meeting first, the order of the list in the design. */
export function sortByDateDesc(meetings: MeetingResponse[]): MeetingResponse[] {
  return [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export interface MeetingListQuery {
  filter: MeetingFilter;
  search: string;
  now: number;
}

/** Applies the tab and the title search; `meetings` keep their order. */
export function filterMeetings(
  meetings: MeetingResponse[],
  { filter, search, now }: MeetingListQuery,
): MeetingResponse[] {
  const needle = search.trim().toLocaleLowerCase('ru-RU');
  return meetings.filter((meeting) => {
    if (filter === MeetingFilter.UPCOMING && isPastMeeting(meeting, now)) {
      return false;
    }
    if (filter === MeetingFilter.PAST && !isPastMeeting(meeting, now)) {
      return false;
    }
    return (
      needle === '' || meeting.title.toLocaleLowerCase('ru-RU').includes(needle)
    );
  });
}
