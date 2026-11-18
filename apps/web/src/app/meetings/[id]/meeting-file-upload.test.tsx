import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type MeetingFileResponse } from '@/lib/api';
import { MeetingFileUpload } from './meeting-file-upload';

const apiMock = vi.hoisted(() => ({ uploadMeetingFile: vi.fn() }));
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, ...apiMock };
});

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

const TOKEN = 'token-123';
const MEETING_ID = 'm1';

const SAVED: MeetingFileResponse = {
  id: 'f1',
  originalName: 'запись.mp3',
  sizeBytes: 3,
  mimeType: 'audio/mpeg',
  uploadedAt: '2026-11-01T10:00:00.000Z',
};

function mp3(name = 'запись.mp3') {
  return new File(['abc'], name, { type: 'audio/mpeg' });
}

/** Simulates the user picking files with the file dialog. */
function pickFiles(files: File[]) {
  const input = screen.getByLabelText('Файл встречи') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

/** Simulates dropping files onto the drop zone. */
function dropFiles(files: File[]) {
  const zone = screen.getByLabelText('Файл встречи').parentElement!;
  fireEvent.drop(zone, { dataTransfer: { files } });
}

/** Upload mock that stays pending until the test resolves or rejects it. */
function pendingUpload() {
  const handles: {
    onProgress?: (percent: number) => void;
    resolve?: (file: MeetingFileResponse) => void;
    reject?: (error: unknown) => void;
  } = {};
  apiMock.uploadMeetingFile.mockImplementation(
    (
      _token: string,
      _meetingId: string,
      _file: File,
      options: {
        signal?: AbortSignal;
        onProgress?: (percent: number) => void;
      },
    ) =>
      new Promise((resolve, reject) => {
        handles.onProgress = options.onProgress;
        handles.resolve = resolve;
        handles.reject = reject;
        options.signal?.addEventListener('abort', () =>
          reject(new DOMException('Загрузка отменена', 'AbortError')),
        );
      }),
  );
  return handles;
}

beforeEach(() => {
  localStorage.setItem('accessToken', TOKEN);
  apiMock.uploadMeetingFile.mockReset();
  routerMock.replace.mockReset();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('MeetingFileUpload selection', () => {
  it('uploads a valid file picked in the dialog and reports the saved file', async () => {
    apiMock.uploadMeetingFile.mockResolvedValue(SAVED);
    const onUploaded = vi.fn();
    const file = mp3();

    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={onUploaded}
      />,
    );
    pickFiles([file]);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(SAVED));
    expect(apiMock.uploadMeetingFile).toHaveBeenCalledWith(
      TOKEN,
      MEETING_ID,
      file,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('uploads a valid file dropped onto the zone', async () => {
    apiMock.uploadMeetingFile.mockResolvedValue(SAVED);
    const onUploaded = vi.fn();

    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={onUploaded}
      />,
    );
    dropFiles([mp3()]);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(SAVED));
  });

  it('rejects an unsupported format in Russian without sending a request', async () => {
    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );

    pickFiles([new File(['x'], 'film.avi', { type: 'video/x-msvideo' })]);

    expect(
      await screen.findByText(/Этот формат не поддерживается/),
    ).toBeTruthy();
    expect(apiMock.uploadMeetingFile).not.toHaveBeenCalled();
  });

  it('rejects a file over 500 MB without sending a request', async () => {
    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );
    const big = mp3();
    Object.defineProperty(big, 'size', { value: 500 * 1024 * 1024 + 1 });

    pickFiles([big]);

    expect(await screen.findByText(/Файл больше 500 МБ/)).toBeTruthy();
    expect(apiMock.uploadMeetingFile).not.toHaveBeenCalled();
  });

  it('accepts one file at a time and rejects several dropped files', async () => {
    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );

    dropFiles([mp3('a.mp3'), mp3('b.mp3')]);

    expect(
      await screen.findByText(
        'За один раз загружается один файл. Выберите один файл.',
      ),
    ).toBeTruthy();
    expect(apiMock.uploadMeetingFile).not.toHaveBeenCalled();
  });

  it('sends the user to login when there is no token', async () => {
    localStorage.clear();
    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );

    pickFiles([mp3()]);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
    expect(apiMock.uploadMeetingFile).not.toHaveBeenCalled();
  });
});

describe('MeetingFileUpload progress and cancel', () => {
  it('shows the progress in percent while uploading', async () => {
    const handles = pendingUpload();

    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );
    pickFiles([mp3()]);

    expect(await screen.findByText('Загрузка… 0%')).toBeTruthy();
    act(() => handles.onProgress?.(40));
    expect(screen.getByText('Загрузка… 40%')).toBeTruthy();
  });

  it('cancelling aborts the upload, adds no file and shows no error', async () => {
    pendingUpload();
    const onUploaded = vi.fn();

    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={onUploaded}
      />,
    );
    pickFiles([mp3()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Отменить' }));

    expect(await screen.findByText(/Перетащите файл сюда/)).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    const signal = apiMock.uploadMeetingFile.mock.calls[0][3]
      .signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });
});

describe('MeetingFileUpload errors', () => {
  it.each([
    [new ApiError(400, 'bad'), /Этот формат не поддерживается/],
    [new ApiError(413, 'big'), /Файл больше 500 МБ/],
    [new ApiError(409, 'full'), /максимум файлов \(5\)/],
    [new ApiError(0, 'offline'), /Соединение прервано/],
    [new ApiError(500, 'boom'), /Сервер не смог сохранить файл/],
  ])('shows a Russian message for %o', async (error, message) => {
    apiMock.uploadMeetingFile.mockRejectedValue(error);
    const onUploaded = vi.fn();

    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={onUploaded}
      />,
    );
    pickFiles([mp3()]);

    expect(await screen.findByText(message)).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('sends the user to login when the token is rejected', async () => {
    apiMock.uploadMeetingFile.mockRejectedValue(
      new ApiError(401, 'Unauthorized'),
    );

    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );
    pickFiles([mp3()]);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
  });
});

describe('MeetingFileUpload limits and lifecycle', () => {
  it('shows no upload controls when the meeting already has 5 files', () => {
    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={5}
        onUploaded={vi.fn()}
      />,
    );

    expect(screen.queryByText('Выбрать файл')).toBeNull();
    expect(screen.getByText(/У встречи уже 5 файлов/)).toBeTruthy();
  });

  it('refuses a dropped file for a full meeting without sending it', async () => {
    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={5}
        onUploaded={vi.fn()}
      />,
    );

    dropFiles([mp3()]);

    // The message shows both in the body and in the error alert.
    expect(
      (await screen.findAllByText(/У встречи уже 5 файлов/)).length,
    ).toBeGreaterThan(0);
    expect(apiMock.uploadMeetingFile).not.toHaveBeenCalled();
  });

  it('keeps upload controls while the file count is still unknown', () => {
    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={null}
        onUploaded={vi.fn()}
      />,
    );

    expect(screen.getByText('Выбрать файл')).toBeTruthy();
  });

  it('hides the cancel button once the body is fully sent', async () => {
    const handles = pendingUpload();

    render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );
    pickFiles([mp3()]);
    expect(
      await screen.findByRole('button', { name: 'Отменить' }),
    ).toBeTruthy();

    act(() => handles.onProgress?.(100));

    expect(screen.queryByRole('button', { name: 'Отменить' })).toBeNull();
    expect(screen.getByText(/сервер сохраняет его/)).toBeTruthy();
  });

  it('aborts a running upload when the form unmounts (for example, on meeting change)', async () => {
    pendingUpload();

    const { unmount } = render(
      <MeetingFileUpload
        meetingId={MEETING_ID}
        filesCount={0}
        onUploaded={vi.fn()}
      />,
    );
    pickFiles([mp3()]);
    await screen.findByRole('button', { name: 'Отменить' });

    unmount();

    const signal = apiMock.uploadMeetingFile.mock.calls[0][3]
      .signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });
});
