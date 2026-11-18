'use client';

import { Alert, Button, Card, Modal, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deleteMeetingFile,
  downloadMeetingFile,
  hasStatus,
  listMeetingFiles,
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
import { formatDateTime, formatFileSize } from '@/lib/format';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; files: MeetingFileResponse[] };

function downloadErrorMessage(error: unknown, fileName: string) {
  if (hasStatus(error, 404)) {
    return `Файл «${fileName}» не найден. Возможно, его уже удалили. Обновите страницу.`;
  }
  return `Не удалось скачать файл «${fileName}». Проверьте подключение и попробуйте снова.`;
}

/** Files of one meeting: list, download and delete (with confirmation). */
export function MeetingFiles({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // The file the delete dialog is about. It is kept after the dialog closes,
  // so the text does not go empty while the dialog animates out.
  const [dialogFile, setDialogFile] = useState<MeetingFileResponse | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      const token = getAccessToken();
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      setLoadState({ status: 'loading' });
      try {
        const files = await listMeetingFiles(token, meetingId);
        if (!isCancelled) {
          setLoadState({ status: 'ready', files });
        }
      } catch (error) {
        if (isCancelled || redirectToLoginIfUnauthorized(error, router)) {
          return;
        }
        setLoadState({ status: 'error' });
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [router, meetingId, reloadKey]);

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

  function openDeleteConfirmation(file: MeetingFileResponse) {
    setDeleteError(null);
    setDialogFile(file);
    setIsDeleteDialogOpen(true);
  }

  function handleModalOpenChange(isOpen: boolean) {
    // Ignore attempts to close the dialog while the delete request is running.
    if (!isOpen && !isDeleting) {
      setIsDeleteDialogOpen(false);
      setDeleteError(null);
    }
  }

  /** Runs only from the "Удалить" button in the confirmation dialog. */
  async function handleConfirmDelete() {
    const file = dialogFile;
    const token = getAccessToken();
    if (!file || !token) {
      router.replace('/auth/login');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeetingFile(token, meetingId, file.id);
    } catch (error) {
      setIsDeleting(false);
      if (redirectToLoginIfUnauthorized(error, router)) {
        return;
      }
      // 404 means the file is already gone, so it is dropped from the list too.
      if (!hasStatus(error, 404)) {
        setDeleteError('Не удалось удалить файл. Попробуйте снова.');
        return;
      }
    }

    setLoadState((current) =>
      current.status === 'ready'
        ? {
            status: 'ready',
            files: current.files.filter((item) => item.id !== file.id),
          }
        : current,
    );
    setIsDeleteDialogOpen(false);
    setIsDeleting(false);
  }

  return (
    <section
      aria-labelledby="meeting-files-title"
      className="flex flex-col gap-3"
    >
      <h2
        id="meeting-files-title"
        className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
      >
        Файлы
      </h2>

      {downloadError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{downloadError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {loadState.status === 'loading' && (
        <div role="status" className="flex items-center justify-center py-12">
          <Spinner size="md" aria-label="Загрузка файлов" />
        </div>
      )}

      {loadState.status === 'error' && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Не удалось загрузить файлы</Alert.Title>
            <Alert.Description>
              Проверьте подключение и попробуйте снова.
            </Alert.Description>
          </Alert.Content>
          <Button
            size="sm"
            variant="outline"
            onPress={() => setReloadKey((key) => key + 1)}
            className="min-h-11"
          >
            Повторить
          </Button>
        </Alert>
      )}

      {loadState.status === 'ready' && loadState.files.length === 0 && (
        <Card>
          <Card.Content>
            <p className="text-zinc-600 dark:text-zinc-400">
              Файлов пока нет. Загрузите файл, и он появится здесь.
            </p>
          </Card.Content>
        </Card>
      )}

      {loadState.status === 'ready' && loadState.files.length > 0 && (
        <ul className="flex flex-col gap-3">
          {loadState.files.map((file) => {
            const isDownloading = downloadingId === file.id;
            return (
              <li key={file.id}>
                <Card>
                  <Card.Content className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="break-all font-medium text-zinc-950 dark:text-zinc-50">
                        {file.originalName}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {formatFileSize(file.sizeBytes)} ·{' '}
                        {formatDateTime(file.uploadedAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        isDisabled={downloadingId !== null}
                        onPress={() => handleDownload(file)}
                      >
                        {isDownloading
                          ? downloadProgress !== null
                            ? `Скачивание… ${downloadProgress}%`
                            : 'Скачивание…'
                          : 'Скачать'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        onPress={() => openDeleteConfirmation(file)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </Card.Content>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isDeleteDialogOpen} onOpenChange={handleModalOpenChange}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Удалить файл?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Файл «{dialogFile?.originalName}» будет удален без возможности
                  восстановления.
                </p>
                {deleteError && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{deleteError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  slot="close"
                  variant="outline"
                  className="min-h-11"
                  isDisabled={isDeleting}
                >
                  Отмена
                </Button>
                <Button
                  variant="danger"
                  className="min-h-11"
                  isDisabled={isDeleting}
                  onPress={handleConfirmDelete}
                >
                  {isDeleting ? 'Удаление…' : 'Удалить'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </section>
  );
}
