/** Error returned by the API, carrying the HTTP status code. */
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

interface ErrorBody {
  message?: string | string[];
}

/** Sends a JSON request to the API through the `/api` rewrite. */
async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  const body = (await response.json().catch(() => null)) as
    ErrorBody | T | null;

  if (!response.ok) {
    const message = (body as ErrorBody | null)?.message;
    throw new ApiError(
      response.status,
      Array.isArray(message)
        ? message.join(', ')
        : (message ?? response.statusText),
    );
  }

  return body as T;
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

/** `GET /meetings` for the user that owns `token`. Rejects with 401 if the token is invalid or expired. */
export function listMeetings(token: string) {
  return apiRequest<MeetingResponse[]>('/meetings', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}
