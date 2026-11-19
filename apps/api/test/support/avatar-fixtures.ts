/** Smallest buffers that carry the real signature of each avatar format. */
export const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('png body'),
]);

export const JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('jpeg body'),
]);

export const WEBP_BYTES = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x10, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 '),
]);

/** Returns the PNG fixture padded with zeros to exactly `size` bytes. */
export const pngOfSize = (size: number): Buffer =>
  Buffer.concat([PNG_BYTES, Buffer.alloc(size - PNG_BYTES.length)]);
