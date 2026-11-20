import {
  ApiError,
  apiRequest,
  authorization,
  errorMessageFrom,
  NETWORK_ERROR_MESSAGE,
  sendRequest,
  toApiError,
} from './api-client';

export enum TranscriptionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** Transcription summary inside a file item. `null` on the file means it is not transcribed (not mp3/mp4). */
export interface TranscriptionSummary {
  status: TranscriptionStatus;
  error: string | null;
}

/** `GET /meetings/:id/files/:fileId/transcription`. */
export interface TranscriptionResponse {
  status: TranscriptionStatus;
  text: string | null;
  error: string | null;
}

/** File of a meeting as returned by `GET /meetings/:id/files`. `uploadedAt` is an ISO 8601 string in JSON. */
export interface MeetingFileResponse {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  transcription: TranscriptionSummary | null;
}

export interface DownloadedFile {
  body: ReadableStream<Uint8Array>;
  fileName: string | null;
  totalBytes: number | null;
}

/** `GET /meetings/:id/files`. Rejects with 404 if the meeting belongs to another user. */
export function listMeetingFiles(token: string, meetingId: string) {
  return apiRequest<MeetingFileResponse[]>(
    `/meetings/${encodeURIComponent(meetingId)}/files`,
    { method: 'GET', headers: authorization(token) },
  );
}

/** `GET /meetings/:id/files/:fileId/transcription`. Rejects with 404 if there is no transcription. */
export function getTranscription(
  token: string,
  meetingId: string,
  fileId: string,
) {
  return apiRequest<TranscriptionResponse>(
    `/meetings/${encodeURIComponent(meetingId)}/files/${encodeURIComponent(fileId)}/transcription`,
    { method: 'GET', headers: authorization(token) },
  );
}

/**
 * `GET /meetings/:id/files/:fileId`. Resolves with the body as a stream (not
 * read into memory), the name from `Content-Disposition` (`null` if the header
 * is missing) and the size from `Content-Length` (`null` if unknown).
 */
export async function downloadMeetingFile(
  token: string,
  meetingId: string,
  fileId: string,
): Promise<DownloadedFile> {
  const response = await sendRequest(
    `/meetings/${encodeURIComponent(meetingId)}/files/${encodeURIComponent(fileId)}`,
    { method: 'GET', headers: authorization(token) },
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (!response.body) {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  const contentLength = Number(response.headers.get('Content-Length'));

  return {
    body: response.body,
    fileName: parseContentDispositionFileName(
      response.headers.get('Content-Disposition'),
    ),
    totalBytes:
      Number.isFinite(contentLength) && contentLength > 0
        ? contentLength
        : null,
  };
}

/** `DELETE /meetings/:id/files/:fileId`. Resolves once the server has removed the file. */
export function deleteMeetingFile(
  token: string,
  meetingId: string,
  fileId: string,
) {
  return apiRequest<null>(
    `/meetings/${encodeURIComponent(meetingId)}/files/${encodeURIComponent(fileId)}`,
    { method: 'DELETE', headers: authorization(token) },
  );
}

/** Progress callback for an upload: percentage from 0 to 100. */
export type UploadProgress = (percent: number) => void;

/**
 * `POST /meetings/:id/files` (multipart field `file`). Uses `XMLHttpRequest`
 * because `fetch` cannot report upload progress.
 *
 * Resolves with the stored file. Rejects with `ApiError` for HTTP errors and
 * network failures. Aborting `signal` calls `xhr.abort()` and rejects with an
 * `AbortError` (`DOMException`), so the caller can tell a cancel from a failure.
 */
export function uploadMeetingFile(
  token: string,
  meetingId: string,
  file: File,
  options: { signal?: AbortSignal; onProgress?: UploadProgress } = {},
): Promise<MeetingFileResponse> {
  const { signal, onProgress } = options;

  return new Promise<MeetingFileResponse>((resolve, reject) => {
    const abortError = () =>
      new DOMException('Загрузка отменена', 'AbortError');

    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `/api/meetings/${encodeURIComponent(meetingId)}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'text';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.floor((event.loaded * 100) / event.total));
      }
    };

    xhr.onload = () => {
      const text = xhr.responseText;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(text) as MeetingFileResponse);
        } catch {
          reject(new ApiError(0, NETWORK_ERROR_MESSAGE));
        }
        return;
      }
      reject(
        new ApiError(
          xhr.status,
          errorMessageFrom(text, xhr.statusText || 'Ошибка сервера'),
        ),
      );
    };
    xhr.onerror = () => reject(new ApiError(0, NETWORK_ERROR_MESSAGE));
    xhr.ontimeout = () => reject(new ApiError(0, NETWORK_ERROR_MESSAGE));
    xhr.onabort = () => reject(abortError());

    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.send(formData);
  });
}

/**
 * Reads the file name from a `Content-Disposition` header. Prefers the
 * RFC 5987 `filename*` parameter, which carries non-ASCII names.
 */
export function parseContentDispositionFileName(
  header: string | null,
): string | null {
  if (!header) {
    return null;
  }

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // Malformed escape sequence: fall back to the plain parameter.
    }
  }

  const plain = /filename="([^"]*)"/i.exec(header);
  return plain ? plain[1] : null;
}
