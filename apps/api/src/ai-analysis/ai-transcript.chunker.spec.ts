import { splitTranscript } from './ai-transcript.chunker.js';

describe('splitTranscript', () => {
  it('returns a short text as one chunk', () => {
    expect(splitTranscript('hello', 100, 10)).toEqual(['hello']);
  });

  it('splits on line breaks, keeps chunks within the limit and loses nothing', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `Line number ${i}.`);
    const chunks = splitTranscript(lines.join('\n'), 200, 30);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(200);
    for (const line of lines) {
      expect(chunks.some((chunk) => chunk.includes(line))).toBe(true);
    }
  });

  it('prefers sentence ends when there are no line breaks', () => {
    const text = 'Привет мир. '.repeat(50);
    const chunks = splitTranscript(text, 100, 10);
    expect(chunks[0].endsWith('. ')).toBe(true);
  });

  it('always moves forward, even with a huge overlap or no boundaries', () => {
    const text = 'x'.repeat(1000);
    const chunks = splitTranscript(text, 100, 500);
    expect(chunks.length).toBeLessThan(30);
    expect(chunks.at(-1)?.endsWith('x')).toBe(true);
  });
});
