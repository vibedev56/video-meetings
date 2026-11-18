/**
 * Saving a downloaded response to the user's disk. Two paths:
 *
 * - With the File System Access API (`showSaveFilePicker`, Chromium), the body
 *   is streamed straight into the chosen file, so the whole file never sits in
 *   memory.
 * - Otherwise the body is collected into a Blob and saved through a link. This
 *   path holds the file in memory, so it is the fallback only.
 */

/** Writable side of the file the user picked. */
export type SaveWritable = WritableStream<Uint8Array>;

/** Called with the bytes received so far. `totalBytes` is null when the size is unknown. */
export type DownloadProgress = (
  receivedBytes: number,
  totalBytes: number | null,
) => void;

interface SaveFilePickerWindow {
  showSaveFilePicker: (options: {
    suggestedName: string;
  }) => Promise<{ createWritable: () => Promise<SaveWritable> }>;
}

export function supportsFilePicker(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as SaveFilePickerWindow).showSaveFilePicker ===
      'function'
  );
}

/**
 * Opens the browser's save dialog. Resolves with a writable if the user picked
 * a file, with `null` if they cancelled, and with `undefined` if the picker
 * failed for another reason (the caller then falls back to a Blob).
 *
 * Call it from a click handler before any `await`: the browser allows the
 * dialog only while the click is still a user gesture.
 */
export async function pickSaveFile(
  suggestedName: string,
): Promise<SaveWritable | null | undefined> {
  const pickerWindow = window as unknown as SaveFilePickerWindow;
  try {
    const handle = await pickerWindow.showSaveFilePicker({ suggestedName });
    return await handle.createWritable();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    return undefined;
  }
}

/** Passes the bytes through unchanged and reports progress as they go by. */
function countBytes(
  totalBytes: number | null,
  onProgress?: DownloadProgress,
): TransformStream<Uint8Array, Uint8Array> {
  let received = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      onProgress?.(received, totalBytes);
      controller.enqueue(chunk);
    },
  });
}

/** Streams `body` into the picked file. Closes the file on success; a failure aborts it, leaving no partial file. */
export async function streamToWritable(
  body: ReadableStream<Uint8Array>,
  writable: SaveWritable,
  totalBytes: number | null,
  onProgress?: DownloadProgress,
): Promise<void> {
  await body.pipeThrough(countBytes(totalBytes, onProgress)).pipeTo(writable);
}

/** Reads `body` fully into a Blob. Used only when the file picker is unavailable. */
export function collectToBlob(
  body: ReadableStream<Uint8Array>,
  totalBytes: number | null,
  onProgress?: DownloadProgress,
): Promise<Blob> {
  return new Response(
    body.pipeThrough(countBytes(totalBytes, onProgress)),
  ).blob();
}

/** Saves `blob` through a temporary object URL and a link click. Browser only. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers start the download asynchronously; revoking at once can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
