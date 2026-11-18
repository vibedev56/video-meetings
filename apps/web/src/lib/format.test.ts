import { describe, expect, it } from 'vitest';
import { formatFileSize } from './format';

describe('formatFileSize', () => {
  it('shows bytes below 1 KB', () => {
    expect(formatFileSize(512)).toBe('512 Б');
  });

  it('scales to KB, MB and GB', () => {
    expect(formatFileSize(2048)).toBe('2 КБ');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 МБ');
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe('3 ГБ');
  });
});
