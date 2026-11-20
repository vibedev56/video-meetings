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

export interface ErrorBody {
  message?: string | string[];
}

export const NETWORK_ERROR_MESSAGE =
  'Нет соединения с сервером. Проверьте подключение и попробуйте снова.';

/**
 * Sends a request to the API through the `/api` rewrite. A network failure
 * (no response at all) is turned into an `ApiError` with status 0.
 */
export async function sendRequest(
  path: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }
}

/** Builds an `ApiError` from a failed response, using the API's `message` when present. */
export async function toApiError(response: Response): Promise<ApiError> {
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
export async function apiRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await sendRequest(path, {
    ...init,
    headers: {
      ...(typeof init.body === 'string'
        ? { 'Content-Type': 'application/json' }
        : {}),
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
export function authorization(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** Extracts the `message` from an error body, or returns `fallback`. */
export function errorMessageFrom(text: string, fallback: string): string {
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
