'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deleteMeetingFile,
  hasStatus,
  listMeetingFiles,
  type MeetingFileResponse,
} from '@/lib/api';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';
import {
  hasActiveTranscription,
  useTranscriptionPolling,
} from './use-transcription-polling';

export type FilesLoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; files: MeetingFileResponse[] };

interface UseMeetingFilesOptions {
  /** Reports whether some file is still being transcribed. */
  onTranscriptionActiveChange?: (isActive: boolean) => void;
  /** Reports the loaded files, or `null` while they load or failed to load. */
  onFilesChange?: (files: MeetingFileResponse[] | null) => void;
}

/**
 * Loading, polling, adding and deleting the files of one meeting. Deleting
 * goes through a confirmation dialog, whose state lives here too.
 */
export function useMeetingFiles(
  meetingId: string,
  { onTranscriptionActiveChange, onFilesChange }: UseMeetingFilesOptions,
) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<FilesLoadState>({
    status: 'loading',
  });
  const [reloadKey, setReloadKey] = useState(0);
  // The file the delete dialog is about. It is kept after the dialog closes,
  // so the text does not go empty while the dialog animates out.
  const [dialogFile, setDialogFile] = useState<MeetingFileResponse | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const files = loadState.status === 'ready' ? loadState.files : null;
  const isTranscribing = files !== null && hasActiveTranscription(files);

  useEffect(() => {
    onTranscriptionActiveChange?.(isTranscribing);
  }, [isTranscribing, onTranscriptionActiveChange]);

  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  useTranscriptionPolling(meetingId, files, (nextFiles) =>
    setLoadState({ status: 'ready', files: nextFiles }),
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
        const loaded = await listMeetingFiles(token, meetingId);
        if (!isCancelled) {
          setLoadState({ status: 'ready', files: loaded });
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

  function handleDeleteOpenChange(isOpen: boolean) {
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

  return {
    loadState,
    reload: () => setReloadKey((key) => key + 1),
    handleUploaded,
    deleteDialog: {
      file: dialogFile,
      isOpen: isDeleteDialogOpen,
      isDeleting,
      error: deleteError,
      open: openDeleteConfirmation,
      onOpenChange: handleDeleteOpenChange,
      onConfirm: handleConfirmDelete,
    },
  };
}
