import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  changePassword,
  deleteMeetingFile,
  downloadMeetingFile,
  listMeetingFiles,
  deleteAvatar,
  getAvatar,
  listMeetings,
  parseContentDispositionFileName,
  updateProfile,
  uploadAvatar,
} from './api';

const TOKEN = 'token-123';
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listMeetingFiles', () => {
  it('sends the Bearer token and returns the file list', async () => {
    const files = [
      {
        id: 'f1',
        originalName: 'запись.mp3',
        sizeBytes: 10,
        mimeType: 'audio/mpeg',
        uploadedAt: '2026-11-01T10:00:00.000Z',
        transcription: null,
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(files));

    await expect(listMeetingFiles(TOKEN, 'm1')).resolves.toEqual(files);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/meetings/m1/files',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
    );
  });

  it('rejects with the API status and message on error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Meeting not found' }, 404),
    );

    const error = await listMeetingFiles(TOKEN, 'm1').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'Meeting not found' });
  });

  it('turns a network failure into ApiError with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await listMeetings(TOKEN).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0 });
  });
});

describe('downloadMeetingFile', () => {
  it('sends the Bearer token and reads the name from Content-Disposition', async () => {
    fetchMock.mockResolvedValue(
      new Response('abc', {
        status: 200,
        headers: {
          'Content-Length': '3',
          'Content-Disposition':
            'attachment; filename="_.mp3"; filename*=UTF-8\'\'%D0%B7%D0%B0%D0%BF%D0%B8%D1%81%D1%8C.mp3',
        },
      }),
    );

    const result = await downloadMeetingFile(TOKEN, 'm1', 'f1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/meetings/m1/files/f1',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
    );
    expect(result.fileName).toBe('запись.mp3');
    expect(result.totalBytes).toBe(3);
    expect(result.body).not.toBeNull();
  });

  it('reports no size when Content-Length is missing', async () => {
    fetchMock.mockResolvedValue(new Response('abc', { status: 200 }));

    const result = await downloadMeetingFile(TOKEN, 'm1', 'f1');

    expect(result.totalBytes).toBeNull();
  });

  it('rejects with the API status when the server fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 500, statusText: 'Internal Server Error' }),
    );

    const error = await downloadMeetingFile(TOKEN, 'm1', 'f1').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500 });
  });

  it('rejects with status 0 when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await downloadMeetingFile(TOKEN, 'm1', 'f1').catch((e) => e);

    expect(error).toMatchObject({ status: 0 });
  });
});

describe('deleteMeetingFile', () => {
  it('sends a DELETE request with the Bearer token', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteMeetingFile(TOKEN, 'm1', 'f1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/meetings/m1/files/f1',
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
    );
  });

  it('rejects with the API status when the file is missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

    const error = await deleteMeetingFile(TOKEN, 'm1', 'f1').catch((e) => e);

    expect(error).toMatchObject({ status: 404 });
  });
});

describe('updateProfile', () => {
  it('sends PATCH /profile with the name and the Bearer token', async () => {
    const profile = { email: 'a@b.c', name: 'Анна', hasAvatar: false };
    fetchMock.mockResolvedValue(jsonResponse(profile));

    await expect(updateProfile(TOKEN, 'Анна')).resolves.toEqual(profile);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Анна' }),
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      }),
    );
  });

  it('rejects with the API status on 400', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'too long' }, 400));

    const error = await updateProfile(TOKEN, 'x').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
  });
});

describe('changePassword', () => {
  it('sends POST /auth/password with both passwords and the Bearer token', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      changePassword(TOKEN, 'old-password', 'new-password'),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          oldPassword: 'old-password',
          newPassword: 'new-password',
        }),
        headers: expect.objectContaining({
          Authorization: `Bearer ${TOKEN}`,
        }),
      }),
    );
  });

  it('rejects with the API status and message on 401', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Invalid credentials' }, 401),
    );

    const error = await changePassword(TOKEN, 'a', 'b').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
  });
});

describe('uploadAvatar', () => {
  it('sends PUT /profile/avatar with the file in the "file" field', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ hasAvatar: true }));
    const file = new File(['x'], 'me.png', { type: 'image/png' });

    await expect(uploadAvatar(TOKEN, file)).resolves.toEqual({
      hasAvatar: true,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile/avatar');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  });

  it('rejects with the API status and message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'bad type' }, 400));

    const error = await uploadAvatar(TOKEN, new File(['x'], 'a.png')).catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'bad type' });
  });

  it('rejects with status 0 on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('failed'));

    const error = await uploadAvatar(TOKEN, new File(['x'], 'a.png')).catch(
      (e) => e,
    );

    expect(error).toMatchObject({ status: 0 });
  });
});

describe('deleteAvatar', () => {
  it('sends DELETE /profile/avatar with the Bearer token', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteAvatar(TOKEN)).resolves.toBeNull();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile/avatar');
    expect(init.method).toBe('DELETE');
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('rejects with the API status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 500));

    const error = await deleteAvatar(TOKEN).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500 });
  });
});

describe('getAvatar', () => {
  it('sends GET /profile/avatar with the Bearer token and returns a Blob', async () => {
    fetchMock.mockResolvedValue(
      new Response('img', {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    );

    const blob = await getAvatar(TOKEN);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile/avatar');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(await blob.text()).toBe('img');
  });

  it('rejects with the API status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 404));

    const error = await getAvatar(TOKEN).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404 });
  });
});

describe('parseContentDispositionFileName', () => {
  it('returns null without a header', () => {
    expect(parseContentDispositionFileName(null)).toBeNull();
  });

  it('prefers filename* over filename', () => {
    expect(
      parseContentDispositionFileName(
        `attachment; filename="a.mp3"; filename*=UTF-8''%D0%B0.mp3`,
      ),
    ).toBe('а.mp3');
  });

  it('falls back to filename when filename* is malformed', () => {
    expect(
      parseContentDispositionFileName(
        `attachment; filename="a.mp3"; filename*=UTF-8''%E0%A4%A`,
      ),
    ).toBe('a.mp3');
  });
});
