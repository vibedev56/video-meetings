import { buildAttachmentDisposition } from './content-disposition.js';

describe('buildAttachmentDisposition', () => {
  it('uses the name as-is for plain ASCII', () => {
    expect(buildAttachmentDisposition('standup.mp3')).toBe(
      `attachment; filename="standup.mp3"; filename*=UTF-8''standup.mp3`,
    );
  });

  it('encodes a non-ASCII name in filename* and keeps an ASCII fallback', () => {
    const header = buildAttachmentDisposition('Запись встречи.mp3');

    expect(header).toContain(`filename="______ _______.mp3"`);
    const encoded = header.split("filename*=UTF-8''")[1];
    expect(decodeURIComponent(encoded)).toBe('Запись встречи.mp3');
  });

  it('escapes quotes and backslashes in the fallback', () => {
    const header = buildAttachmentDisposition('a"b\\c.mp3');

    expect(header).toContain(`filename="a_b_c.mp3"`);
  });

  it('percent-encodes characters that RFC 5987 leaves unescaped', () => {
    const header = buildAttachmentDisposition("it's (final)*.mp3");

    expect(header).toContain("filename*=UTF-8''it%27s%20%28final%29%2A.mp3");
  });
});
