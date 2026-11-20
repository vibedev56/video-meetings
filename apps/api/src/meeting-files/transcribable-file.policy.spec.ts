import { isTranscribableFile } from './transcribable-file.policy.js';

describe('isTranscribableFile', () => {
  it.each(['talk.mp3', 'talk.mp4', 'TALK.MP3', 'Meeting.Final.Mp4'])(
    'accepts %s',
    (name) => {
      expect(isTranscribableFile(name)).toBe(true);
    },
  );

  it.each([
    'talk.wav',
    'talk.m4a',
    'talk.webm',
    'talk.mov',
    'mp3',
    'talk.mp3.exe',
    '',
  ])('rejects "%s"', (name) => {
    expect(isTranscribableFile(name)).toBe(false);
  });
});
