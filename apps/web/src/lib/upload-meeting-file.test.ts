import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type MeetingFileResponse, uploadMeetingFile } from './api';

/** Minimal XMLHttpRequest stand-in: the test drives progress, load and error events. */
class FakeXhr {
  static instances: FakeXhr[] = [];

  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: FormData | null = null;
  responseType = '';
  status = 0;
  statusText = '';
  responseText = '';
  aborted = false;
  upload = {
    onprogress: null as ((event: Partial<ProgressEvent>) => void) | null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: FormData) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

const TOKEN = 'token-123';
const MEETING_ID = 'm1';

const SAVED: MeetingFileResponse = {
  id: 'f1',
  originalName: 'запись.mp3',
  sizeBytes: 2048,
  mimeType: 'audio/mpeg',
  uploadedAt: '2026-11-01T10:00:00.000Z',
};

function makeFile() {
  return new File(['abc'], 'запись.mp3', { type: 'audio/mpeg' });
}

function lastXhr(): FakeXhr {
  const xhr = FakeXhr.instances.at(-1);
  if (!xhr) {
    throw new Error('No XHR was created');
  }
  return xhr;
}

beforeEach(() => {
  FakeXhr.instances = [];
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadMeetingFile', () => {
  it('posts the file as multipart field "file" with the Bearer token', () => {
    const file = makeFile();

    void uploadMeetingFile(TOKEN, MEETING_ID, file);

    const xhr = lastXhr();
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/meetings/m1/files');
    expect(xhr.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(xhr.body?.get('file')).toBeInstanceOf(File);
  });

  it('reports progress as a whole percentage', () => {
    const onProgress = vi.fn();

    void uploadMeetingFile(TOKEN, MEETING_ID, makeFile(), { onProgress });

    const xhr = lastXhr();
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 3 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 3, total: 3 });
    expect(onProgress.mock.calls).toEqual([[33], [100]]);
  });

  it('ignores progress events when the total size is unknown', () => {
    const onProgress = vi.fn();

    void uploadMeetingFile(TOKEN, MEETING_ID, makeFile(), { onProgress });

    lastXhr().upload.onprogress?.({ lengthComputable: false, loaded: 5 });
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('resolves with the stored file on 201', async () => {
    const promise = uploadMeetingFile(TOKEN, MEETING_ID, makeFile());

    const xhr = lastXhr();
    xhr.status = 201;
    xhr.responseText = JSON.stringify(SAVED);
    xhr.onload?.();

    await expect(promise).resolves.toEqual(SAVED);
  });

  it('rejects with the status and the API message on an HTTP error', async () => {
    const promise = uploadMeetingFile(TOKEN, MEETING_ID, makeFile());

    const xhr = lastXhr();
    xhr.status = 413;
    xhr.responseText = JSON.stringify({ message: 'File is too large' });
    xhr.onload?.();

    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(413);
    expect((error as ApiError).message).toBe('File is too large');
  });

  it('rejects with status 0 when the network fails', async () => {
    const promise = uploadMeetingFile(TOKEN, MEETING_ID, makeFile());

    lastXhr().onerror?.();

    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });

  it('rejects with status 0 on timeout', async () => {
    const promise = uploadMeetingFile(TOKEN, MEETING_ID, makeFile());

    lastXhr().ontimeout?.();

    const error = await promise.catch((caught: unknown) => caught);
    expect((error as ApiError).status).toBe(0);
  });

  it('aborts the request and rejects with AbortError when the signal fires', async () => {
    const controller = new AbortController();
    const promise = uploadMeetingFile(TOKEN, MEETING_ID, makeFile(), {
      signal: controller.signal,
    });

    controller.abort();

    const xhr = lastXhr();
    expect(xhr.aborted).toBe(true);
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe('AbortError');
  });

  it('does not send the request when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const promise = uploadMeetingFile(TOKEN, MEETING_ID, makeFile(), {
      signal: controller.signal,
    });

    expect(FakeXhr.instances).toHaveLength(0);
    const error = await promise.catch((caught: unknown) => caught);
    expect((error as DOMException).name).toBe('AbortError');
  });
});
