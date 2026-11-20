import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  downloadMeetingFile,
  hasStatus,
  type MeetingFileResponse,
} from '@/lib/api';
import {
  collectToBlob,
  pickSaveFile,
  saveBlob,
  streamToWritable,
  supportsFilePicker,
  type SaveWritable,
} from '@/lib/file-download';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';

function downloadErrorMessage(error: unknown, fileName: string) {
  if (hasStatus(error, 404)) {
    return `Файл «${fileName}» не найден. Возможно, его уже удалили. Обновите страницу.`;
  }
  return `Не удалось скачать файл «${fileName}». Проверьте подключение и попробуйте снова.`;
}

/** Download state and handler for the files of one meeting. */
export function useFileDownload(meetingId: string) {
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload(file: MeetingFileResponse) {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    setDownloadError(null);
    setDownloadingId(file.id);
    setDownloadProgress(null);

    // Open the save dialog before any `await`: the browser allows it only
    // while the click is still a user gesture.
    const picked = supportsFilePicker()
      ? pickSaveFile(file.originalName)
      : Promise.resolve(undefined);
    let writable: SaveWritable | undefined;

    try {
      const target = await picked;
      if (target === null) {
        // The user cancelled the save dialog: nothing to download.
        return;
      }
      writable = target;

      const { body, fileName, totalBytes } = await downloadMeetingFile(
        token,
        meetingId,
        file.id,
      );
      const onProgress = (received: number, total: number | null) =>
        setDownloadProgress(
          total ? Math.min(100, Math.floor((received * 100) / total)) : null,
        );

      if (writable) {
        await streamToWritable(body, writable, totalBytes, onProgress);
      } else {
        const blob = await collectToBlob(body, totalBytes, onProgress);
        saveBlob(blob, fileName ?? file.originalName);
      }
    } catch (error) {
      // Drop the partly written file so no half-downloaded copy remains.
      await writable?.abort().catch(() => undefined);
      if (redirectToLoginIfUnauthorized(error, router)) {
        return;
      }
      setDownloadError(downloadErrorMessage(error, file.originalName));
    } finally {
      setDownloadingId(null);
      setDownloadProgress(null);
    }
  }

  return { downloadingId, downloadProgress, downloadError, handleDownload };
}
