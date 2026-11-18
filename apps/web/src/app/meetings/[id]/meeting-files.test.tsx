import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type MeetingFileResponse } from '@/lib/api';
import { MeetingFiles } from './meeting-files';

const apiMock = vi.hoisted(() => ({
  listMeetingFiles: vi.fn(),
  downloadMeetingFile: vi.fn(),
  deleteMeetingFile: vi.fn(),
  saveBlob: vi.fn(),
}));

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

const FILE: MeetingFileResponse = {
  id: 'f1',
  originalName: 'запись.mp3',
  sizeBytes: 2048,
  mimeType: 'audio/mpeg',
  uploadedAt: '2026-11-01T10:00:00.000Z',
};

beforeEach(() => {
  localStorage.setItem('accessToken', TOKEN);
  Object.values(apiMock).forEach((mock) => mock.mockReset());
  routerMock.replace.mockReset();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('MeetingFiles list', () => {
  it('shows the empty state when the meeting has no files', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([]);

    render(<MeetingFiles meetingId={MEETING_ID} />);

    expect(await screen.findByText(/Файлов пока нет/)).toBeTruthy();
    expect(apiMock.listMeetingFiles).toHaveBeenCalledWith(TOKEN, MEETING_ID);
  });

  it('shows name, size and upload date of each file', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([FILE]);

    render(<MeetingFiles meetingId={MEETING_ID} />);

    expect(await screen.findByText('запись.mp3')).toBeTruthy();
    expect(screen.getByText(/2 КБ/)).toBeTruthy();
  });

  it('shows a retry alert when loading fails', async () => {
    apiMock.listMeetingFiles.mockRejectedValue(new ApiError(0, 'offline'));

    render(<MeetingFiles meetingId={MEETING_ID} />);

    expect(await screen.findByText('Не удалось загрузить файлы')).toBeTruthy();
  });

  it('sends the user to login when the token is rejected', async () => {
    apiMock.listMeetingFiles.mockRejectedValue(
      new ApiError(401, 'Unauthorized'),
    );

    render(<MeetingFiles meetingId={MEETING_ID} />);

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/auth/login'),
    );
  });
});

describe('MeetingFiles download', () => {
  it('saves the downloaded blob under the server file name', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([FILE]);
    const blob = new Blob(['abc']);
    apiMock.downloadMeetingFile.mockResolvedValue({
      blob,
      fileName: 'запись.mp3',
    });

    render(<MeetingFiles meetingId={MEETING_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Скачать' }));

    await waitFor(() =>
      expect(apiMock.saveBlob).toHaveBeenCalledWith(blob, 'запись.mp3'),
    );
    expect(apiMock.downloadMeetingFile).toHaveBeenCalledWith(
      TOKEN,
      MEETING_ID,
      FILE.id,
    );
  });

  it('shows a Russian error message when the download fails', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([FILE]);
    apiMock.downloadMeetingFile.mockRejectedValue(
      new ApiError(500, 'Internal Server Error'),
    );

    render(<MeetingFiles meetingId={MEETING_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Скачать' }));

    expect(
      await screen.findByText(/Не удалось скачать файл «запись.mp3»/),
    ).toBeTruthy();
    expect(apiMock.saveBlob).not.toHaveBeenCalled();
  });
});

describe('MeetingFiles delete', () => {
  it('does not send a delete request before confirmation', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([FILE]);

    render(<MeetingFiles meetingId={MEETING_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Удалить файл?')).toBeTruthy();
    expect(apiMock.deleteMeetingFile).not.toHaveBeenCalled();
  });

  it('removes the file from the list after confirmation', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([FILE]);
    apiMock.deleteMeetingFile.mockResolvedValue(null);

    render(<MeetingFiles meetingId={MEETING_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Удалить' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }));

    await waitFor(() => expect(screen.queryByText('запись.mp3')).toBeNull());
    expect(apiMock.deleteMeetingFile).toHaveBeenCalledWith(
      TOKEN,
      MEETING_ID,
      FILE.id,
    );
    expect(screen.getByText(/Файлов пока нет/)).toBeTruthy();
  });

  it('keeps the file when the dialog is cancelled', async () => {
    apiMock.listMeetingFiles.mockResolvedValue([FILE]);

    render(<MeetingFiles meetingId={MEETING_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Удалить' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiMock.deleteMeetingFile).not.toHaveBeenCalled();
    expect(screen.getByText('запись.mp3')).toBeTruthy();
  });
});
