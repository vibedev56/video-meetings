'use client';

import { Alert, Button, Card, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deleteMeetingFile,
  hasStatus,
  listMeetingFiles,
  type MeetingFileResponse,
} from '@/lib/api';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';
import { DeleteFileDialog } from './delete-file-dialog';
import { MeetingFileItem } from './meeting-file-item';
import { MeetingFileUpload } from './meeting-file-upload';
import { TranscriptDialog } from './transcript-dialog';
import { useFileDownload } from './use-file-download';
import { useTranscriptionPolling } from './use-transcription-polling';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; files: MeetingFileResponse[] };

/** Files of one meeting: list, download and delete (with confirmation). */
export function MeetingFiles({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const { downloadingId, downloadProgress, downloadError, handleDownload } =
    useFileDownload(meetingId);
  // The file the delete dialog is about. It is kept after the dialog closes,
  // so the text does not go empty while the dialog animates out.
  const [dialogFile, setDialogFile] = useState<MeetingFileResponse | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [transcriptFile, setTranscriptFile] =
    useState<MeetingFileResponse | null>(null);

  useTranscriptionPolling(
    meetingId,
    loadState.status === 'ready' ? loadState.files : null,
    (files) => setLoadState({ status: 'ready', files }),
  );

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

  /** Adds an uploaded file to the list. If the list is still loading, it is fetched again instead. */
  function handleUploaded(file: MeetingFileResponse) {
    setLoadState((current) =>
      current.status === 'ready'
        ? { status: 'ready', files: [...current.files, file] }
        : current,
    );
    if (loadState.status !== 'ready') {
      setReloadKey((key) => key + 1);
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

      {/* Keyed by meeting: switching meetings remounts the form, which aborts any upload still running for the previous one. */}
      <MeetingFileUpload
        key={meetingId}
        meetingId={meetingId}
        filesCount={
          loadState.status === 'ready' ? loadState.files.length : null
        }
        onUploaded={handleUploaded}
      />

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
          {loadState.files.map((file) => (
            <MeetingFileItem
              key={file.id}
              file={file}
              isDownloading={downloadingId === file.id}
              isDownloadBusy={downloadingId !== null}
              downloadProgress={downloadProgress}
              onDownload={handleDownload}
              onShowTranscript={setTranscriptFile}
              onDelete={openDeleteConfirmation}
            />
          ))}
        </ul>
      )}

      <TranscriptDialog
        meetingId={meetingId}
        file={transcriptFile}
        onClose={() => setTranscriptFile(null)}
      />

      <DeleteFileDialog
        isOpen={isDeleteDialogOpen}
        file={dialogFile}
        isDeleting={isDeleting}
        error={deleteError}
        onOpenChange={handleModalOpenChange}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
