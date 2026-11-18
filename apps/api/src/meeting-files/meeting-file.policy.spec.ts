import {
  canUploadMoreFiles,
  decodeMultipartFilename,
  isAllowedMeetingFileType,
  isWithinSizeLimit,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_MEETING,
} from './meeting-file.policy.js';

describe('isAllowedMeetingFileType', () => {
  it.each([
    ['recording.mp3', 'audio/mpeg'],
    ['recording.wav', 'audio/wav'],
    ['recording.m4a', 'audio/x-m4a'],
    ['recording.m4a', 'audio/mp4'],
    ['recording.ogg', 'audio/ogg'],
    ['recording.mp4', 'video/mp4'],
    ['recording.webm', 'video/webm'],
    ['recording.mov', 'video/quicktime'],
  ])('accepts %s with MIME %s', (name, mime) => {
    expect(isAllowedMeetingFileType(name, mime)).toBe(true);
  });

  it('matches the extension case-insensitively', () => {
    expect(isAllowedMeetingFileType('RECORDING.MP3', 'audio/mpeg')).toBe(true);
  });

  it('matches the MIME type case-insensitively', () => {
    expect(isAllowedMeetingFileType('recording.mov', 'Video/QuickTime')).toBe(
      true,
    );
  });

  it('rejects an allowed MIME type paired with an extension it does not belong to', () => {
    expect(isAllowedMeetingFileType('recording.mp3', 'video/quicktime')).toBe(
      false,
    );
    expect(isAllowedMeetingFileType('recording.mov', 'audio/mpeg')).toBe(false);
  });

  it('rejects an unsupported extension even with a plausible MIME type', () => {
    expect(isAllowedMeetingFileType('notes.pdf', 'application/pdf')).toBe(
      false,
    );
    expect(isAllowedMeetingFileType('clip.avi', 'video/x-msvideo')).toBe(false);
  });

  it('rejects a file without an extension', () => {
    expect(isAllowedMeetingFileType('recording', 'audio/mpeg')).toBe(false);
  });

  it('rejects generic MIME types sent by browsers for unknown files', () => {
    expect(
      isAllowedMeetingFileType('recording.mp3', 'application/octet-stream'),
    ).toBe(false);
  });

  it('does not treat Object prototype keys as allowed extensions', () => {
    expect(isAllowedMeetingFileType('file.constructor', 'audio/mpeg')).toBe(
      false,
    );
  });
});

describe('isWithinSizeLimit', () => {
  it('accepts a file of exactly 500 MB', () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES)).toBe(true);
  });

  it('rejects a file one byte over 500 MB', () => {
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
  });

  it('accepts an empty file', () => {
    expect(isWithinSizeLimit(0)).toBe(true);
  });
});

describe('canUploadMoreFiles', () => {
  it('allows the fifth file (four files already stored)', () => {
    expect(canUploadMoreFiles(MAX_FILES_PER_MEETING - 1)).toBe(true);
  });

  it('rejects the sixth file (five files already stored)', () => {
    expect(canUploadMoreFiles(MAX_FILES_PER_MEETING)).toBe(false);
  });

  it('allows the first file of an empty meeting', () => {
    expect(canUploadMoreFiles(0)).toBe(true);
  });
});

describe('decodeMultipartFilename', () => {
  it('restores a UTF-8 name that multipart delivered as latin1', () => {
    const raw = Buffer.from('Запись встречи.mp3', 'utf8').toString('latin1');

    expect(decodeMultipartFilename(raw)).toBe('Запись встречи.mp3');
  });

  it('leaves an ASCII name unchanged', () => {
    expect(decodeMultipartFilename('standup.mp3')).toBe('standup.mp3');
  });
});
