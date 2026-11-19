import { describe, expect, it } from 'vitest';
import { displayName, getInitials } from './profile';

describe('displayName', () => {
  it('returns the name when it is set', () => {
    expect(displayName({ name: 'Иван Петров', email: 'a@b.c' })).toBe(
      'Иван Петров',
    );
  });

  it('falls back to the email for a null or blank name', () => {
    expect(displayName({ name: null, email: 'a@b.c' })).toBe('a@b.c');
    expect(displayName({ name: '   ', email: 'a@b.c' })).toBe('a@b.c');
  });
});

describe('getInitials', () => {
  it('takes the first letters of the first two words of the name', () => {
    expect(getInitials({ name: 'иван петров сидоров', email: 'a@b.c' })).toBe(
      'ИП',
    );
  });

  it('uses one letter for a single-word name', () => {
    expect(getInitials({ name: 'Иван', email: 'a@b.c' })).toBe('И');
  });

  it('uses the first letter of the email when there is no name', () => {
    expect(getInitials({ name: null, email: 'zed@b.c' })).toBe('Z');
  });
});
