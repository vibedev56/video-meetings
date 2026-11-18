import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  deleteMeetingFile,
  downloadMeetingFile,
  listMeetingFiles,
  listMeetings,
  parseContentDispositionFileName,
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
