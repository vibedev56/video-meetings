import { describe, expect, it } from 'vitest';
import {
  FILE_TOO_LARGE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  UNSUPPORTED_FORMAT_MESSAGE,
  validateMeetingFile,
} from './file-validation';

const MB = 1024 * 1024;

describe('validateMeetingFile', () => {
  it.each([
    ['запись.mp3', 'audio/mpeg'],
    ['запись.wav', 'audio/wav'],
    ['запись.m4a', 'audio/x-m4a'],
    ['запись.ogg', 'audio/ogg'],
    ['запись.mp4', 'video/mp4'],
    ['запись.webm', 'video/webm'],
    ['запись.mov', 'video/quicktime'],
  ])('accepts %s with MIME %s', (name, type) => {
    expect(validateMeetingFile({ name, size: 1000, type })).toBeNull();
  });

  it('matches the extension case-insensitively', () => {
    expect(
      validateMeetingFile({ name: 'REC.MP3', size: 1000, type: 'audio/mpeg' }),
    ).toBeNull();
  });

  it('accepts the alternative MIME type of a known extension', () => {
    expect(
      validateMeetingFile({ name: 'a.m4a', size: 1000, type: 'audio/mp4' }),
    ).toBeNull();
  });

  it('rejects an unsupported extension', () => {
    expect(
      validateMeetingFile({
        name: 'film.avi',
        size: 1000,
        type: 'video/x-msvideo',
      }),
    ).toBe(UNSUPPORTED_FORMAT_MESSAGE);
  });

  it('rejects a supported extension with a MIME type from another pair', () => {
    expect(
      validateMeetingFile({ name: 'a.mp3', size: 1000, type: 'video/mp4' }),
    ).toBe(UNSUPPORTED_FORMAT_MESSAGE);
  });

  it('rejects a file without an extension', () => {
    expect(
      validateMeetingFile({ name: 'запись', size: 1000, type: 'audio/mpeg' }),
    ).toBe(UNSUPPORTED_FORMAT_MESSAGE);
  });

  it('accepts a file of exactly 500 MB', () => {
    expect(
      validateMeetingFile({
        name: 'a.mp4',
        size: MAX_FILE_SIZE_BYTES,
        type: 'video/mp4',
      }),
    ).toBeNull();
  });

  it('rejects a file one byte over 500 MB', () => {
    expect(
      validateMeetingFile({
        name: 'a.mp4',
        size: MAX_FILE_SIZE_BYTES + 1,
        type: 'video/mp4',
      }),
    ).toBe(FILE_TOO_LARGE_MESSAGE);
  });

  it('reports the format before the size', () => {
    expect(
      validateMeetingFile({ name: 'a.avi', size: 600 * MB, type: '' }),
    ).toBe(UNSUPPORTED_FORMAT_MESSAGE);
  });
});
