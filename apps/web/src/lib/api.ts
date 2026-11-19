/** Error returned by the API, carrying the HTTP status code. Status 0 means the request never reached the server. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthTokenResponse {
  accessToken: string;
}

/** Meeting as returned by `GET /meetings`. `date` is an ISO 8601 string in JSON. */
export interface MeetingResponse {
  id: string;
  title: string;
  date: string;
  participants: string[];
}

/** File of a meeting as returned by `GET /meetings/:id/files`. `uploadedAt` is an ISO 8601 string in JSON. */
export interface MeetingFileResponse {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface DownloadedFile {
  body: ReadableStream<Uint8Array>;
  fileName: string | null;
  totalBytes: number | null;
}

interface ErrorBody {
  message?: string | string[];
}

const NETWORK_ERROR_MESSAGE =
  'Нет соединения с сервером. Проверьте подключение и попробуйте снова.';

/**
 * Sends a request to the API through the `/api` rewrite. A network failure
 * (no response at all) is turned into an `ApiError` with status 0.
 */
async function sendRequest(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }
}

/** Builds an `ApiError` from a failed response, using the API's `message` when present. */
async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  const message = body?.message;

  return new ApiError(
    response.status,
    Array.isArray(message)
      ? message.join(', ')
      : (message ?? response.statusText),
  );
}

/** Sends a request and resolves with the parsed JSON body (`null` for empty bodies). */
async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await sendRequest(path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json().catch(() => null)) as T;
}

/** True if `error` is an `ApiError` with exactly this HTTP status. */
export function hasStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

/** Headers for a request made with the user's access token. */
function authorization(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** `POST /auth/register`. Resolves with the access token of the new user. */
export function registerUser(email: string, password: string) {
  return apiRequest<AuthTokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** `POST /auth/login`. Rejects with status 401 on wrong credentials. */
export function loginUser(email: string, password: string) {
  return apiRequest<AuthTokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** Profile of the current user as returned by `GET /profile`. */
export interface ProfileResponse {
  email: string;
  name: string | null;
  hasAvatar: boolean;
}

/** `GET /profile`. Rejects with 401 if the token is invalid or expired. */
export function getProfile(token: string) {
  return apiRequest<ProfileResponse>('/profile', {
    method: 'GET',
    headers: authorization(token),
  });
}

/** `PATCH /profile`. An empty or whitespace-only name resets it. Rejects with 400 for a too long name. */
export function updateProfile(token: string, name: string) {
  return apiRequest<ProfileResponse>('/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
    headers: authorization(token),
  });
}

/**
 * `POST /auth/password`. Resolves with `null` (204). Rejects with 401 and the
 * message `Invalid credentials` for a wrong old password, with 400 for a weak
 * new password or one equal to the old.
 */
export function changePassword(
  token: string,
  oldPassword: string,
  newPassword: string,
) {
  return apiRequest<null>('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
    headers: authorization(token),
  });
}

/** `GET /meetings` for the user that owns `token`. Rejects with 401 if the token is invalid or expired. */
export function listMeetings(token: string) {
  return apiRequest<MeetingResponse[]>('/meetings', {
    method: 'GET',
    headers: authorization(token),
  });
}

/** `POST /meetings`. `date` is an ISO 8601 string. Rejects with 400 on invalid data. */
export function createMeeting(
  token: string,
  meeting: { title: string; date: string; participants: string[] },
) {
  return apiRequest<MeetingResponse>('/meetings', {
    method: 'POST',
    headers: authorization(token),
    body: JSON.stringify(meeting),
  });
}

/** `GET /meetings/:id`. Rejects with 404 if the meeting does not exist or belongs to another user. */
export function getMeeting(token: string, meetingId: string) {
  return apiRequest<MeetingResponse>(
    `/meetings/${encodeURIComponent(meetingId)}`,
    { method: 'GET', headers: authorization(token) },
  );
}

/** `GET /meetings/:id/files`. Rejects with 404 if the meeting belongs to another user. */
export function listMeetingFiles(token: string, meetingId: string) {
  return apiRequest<MeetingFileResponse[]>(
    `/meetings/${encodeURIComponent(meetingId)}/files`,
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

/** Extracts the `message` from an error body, or returns `fallback`. */
function errorMessageFrom(text: string, fallback: string): string {
  try {
    const message = (JSON.parse(text) as ErrorBody | null)?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message ?? fallback;
  } catch {
    return fallback;
  }
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
