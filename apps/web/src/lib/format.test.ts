import { describe, expect, it } from 'vitest';
import {
  formatDateBadge,
  formatDateTime,
  formatFileSize,
  formatMeetingDateLine,
  formatMeetingDay,
  formatMeetingsCount,
  formatMeetingTime,
} from './format';

describe('formatFileSize', () => {
  it('shows bytes below 1 KB', () => {
    expect(formatFileSize(512)).toBe('512 Б');
  });

  it('scales to KB, MB and GB', () => {
    expect(formatFileSize(2048)).toBe('2 КБ');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 МБ');
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe('3 ГБ');
  });

  it('moves to the next unit when rounding reaches 1024', () => {
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1 МБ');
  });
});

describe('formatDateTime', () => {
  it('returns a placeholder for an invalid date', () => {
    expect(formatDateTime('not-a-date')).toBe('Дата неизвестна');
  });
});

describe('meeting list formatting', () => {
  it('formats the day, the time and the card date line', () => {
    const iso = new Date(2026, 10, 13, 15, 12).toISOString();
    expect(formatMeetingDay(iso)).toBe('13 ноября 2026 г.');
    expect(formatMeetingTime(iso)).toBe('15:12');
    expect(formatMeetingDateLine(iso)).toBe('13 ноября 2026 в 15:12');
  });

  it('gives placeholders for an invalid date', () => {
    expect(formatMeetingDay('nope')).toBe('Дата неизвестна');
    expect(formatMeetingTime('nope')).toBe('');
    expect(formatMeetingDateLine('nope')).toBe('Дата неизвестна');
  });

  it('declines the meetings count', () => {
    expect(formatMeetingsCount(1)).toBe('1 встреча');
    expect(formatMeetingsCount(2)).toBe('2 встречи');
    expect(formatMeetingsCount(5)).toBe('5 встреч');
    expect(formatMeetingsCount(21)).toBe('21 встреча');
  });
});

describe('formatDateBadge', () => {
  it('gives the day and a three-letter month', () => {
    const iso = new Date(2026, 10, 13, 15, 12).toISOString();
    expect(formatDateBadge(iso)).toEqual({ day: '13', month: 'НОЯ' });
    expect(formatDateBadge('nope')).toEqual({ day: '—', month: '' });
  });
});
