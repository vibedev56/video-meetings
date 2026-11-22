const SENTENCE_END = /[.!?…]["')»]?\s/g;

/**
 * Finds a cut position in (start, end]: the last line break, else the last
 * sentence end, in the second half of the window; `end` when none is found.
 */
function findCutPosition(text: string, start: number, end: number): number {
  const windowStart = start + Math.floor((end - start) / 2);
  const window = text.slice(windowStart, end);
  const lineBreak = window.lastIndexOf('\n');
  if (lineBreak >= 0) return windowStart + lineBreak + 1;

  let sentenceEnd = -1;
  for (const match of window.matchAll(SENTENCE_END)) {
    sentenceEnd = match.index + match[0].length;
  }
  return sentenceEnd > 0 ? windowStart + sentenceEnd : end;
}

/**
 * Splits a long transcript into chunks of at most `chunkChars` characters on
 * line or sentence boundaries; neighbouring chunks share about `overlapChars`
 * so a sentence on a boundary is seen whole at least once.
 */
export function splitTranscript(
  text: string,
  chunkChars: number,
  overlapChars: number,
): string[] {
  if (text.length <= chunkChars) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const hardEnd = Math.min(start + chunkChars, text.length);
    const end =
      hardEnd === text.length ? hardEnd : findCutPosition(text, start, hardEnd);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    // Always advance by at least half a chunk, so a big overlap cannot stall.
    start = Math.max(end - overlapChars, start + Math.floor(chunkChars / 2));
  }
  return chunks;
}
