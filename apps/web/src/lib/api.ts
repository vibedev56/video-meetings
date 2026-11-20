import {
  apiRequest,
  authorization,
  sendRequest,
  toApiError,
} from './api-client';

export * from './api-client';
export * from './meeting-files-api';

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

export enum AiProcessingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  DONE = 'DONE',
}

/** Action item extracted from a meeting by the AI. */
export interface TaskResponse {
  id: string;
  title: string;
  assignee: string | null;
  status: TaskStatus;
  sourceMeetingId: string;
  createdAt: string;
}

/** Meeting as returned by `GET /meetings/:id`, with the AI results. */
export interface MeetingDetailResponse extends MeetingResponse {
  summary: string | null;
  decisions: string[];
  aiStatus: AiProcessingStatus;
  aiError: string | null;
  tasks: TaskResponse[];
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
 * `PUT /profile/avatar` (multipart field `file`). Replaces the current avatar.
 * Rejects with the API status (for example 400 for a bad format, 413 for a
 * file that is too large).
 */
export function uploadAvatar(token: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  // No JSON content type: the browser sets the multipart boundary itself.
  return apiRequest<{ hasAvatar: true }>('/profile/avatar', {
    method: 'PUT',
    body: formData,
    headers: authorization(token),
  });
}

/**
 * `GET /profile/avatar`. Resolves with the image; `'thumb'` asks for the small
 * 128 px webp (`?size=thumb`). Rejects with 404 when there is no avatar.
 */
export async function getAvatar(token: string, size?: 'thumb'): Promise<Blob> {
  const response = await sendRequest(
    size ? `/profile/avatar?size=${size}` : '/profile/avatar',
    {
      method: 'GET',
      headers: authorization(token),
    },
  );
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.blob();
}

/** `DELETE /profile/avatar`. Resolves with `null` (204). */
export function deleteAvatar(token: string) {
  return apiRequest<null>('/profile/avatar', {
    method: 'DELETE',
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
  return apiRequest<MeetingDetailResponse>(
    `/meetings/${encodeURIComponent(meetingId)}`,
    { method: 'GET', headers: authorization(token) },
  );
}
