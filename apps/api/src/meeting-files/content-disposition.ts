/**
 * `attachment` header with an ASCII fallback in `filename` and the exact name
 * in `filename*` (RFC 5987), so non-ASCII names such as Cyrillic survive.
 */
export function buildAttachmentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  // encodeURIComponent leaves ' ( ) * unescaped, which RFC 5987 does not allow.
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
