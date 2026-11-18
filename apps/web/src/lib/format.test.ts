import { describe, expect, it } from 'vitest';
import { formatDateTime, formatFileSize } from './format';

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
