import { describe, expect, it } from 'vitest';
import type { MeetingResponse } from '@/lib/api';
import {
  filterMeetings,
  isPastMeeting,
  MeetingFilter,
  sortByDateDesc,
} from './meeting-list';

const NOW = new Date('2026-11-20T12:00:00Z').getTime();

function makeMeeting(id: string, title: string, date: string): MeetingResponse {
  return { id, title, date, participants: [] };
}

const past = makeMeeting('1', 'Еженедельный синк', '2026-11-13T12:12:00Z');
const upcoming = makeMeeting('2', 'Ретро', '2026-11-27T10:00:00Z');

describe('meeting list helpers', () => {
  it('tells past meetings from upcoming ones', () => {
    expect(isPastMeeting(past, NOW)).toBe(true);
    expect(isPastMeeting(upcoming, NOW)).toBe(false);
  });

  it('sorts newest first without mutating the input', () => {
    const input = [past, upcoming];
    expect(sortByDateDesc(input).map((m) => m.id)).toEqual(['2', '1']);
    expect(input.map((m) => m.id)).toEqual(['1', '2']);
  });

  it('filters by tab', () => {
    const all = [past, upcoming];
    const query = { search: '', now: NOW };
    expect(
      filterMeetings(all, { ...query, filter: MeetingFilter.ALL }),
    ).toHaveLength(2);
    expect(
      filterMeetings(all, { ...query, filter: MeetingFilter.UPCOMING }),
    ).toEqual([upcoming]);
    expect(
      filterMeetings(all, { ...query, filter: MeetingFilter.PAST }),
    ).toEqual([past]);
  });

  it('searches titles ignoring case and surrounding spaces', () => {
    expect(
      filterMeetings([past, upcoming], {
        filter: MeetingFilter.ALL,
        search: '  СИНК ',
        now: NOW,
      }),
    ).toEqual([past]);
  });
});
