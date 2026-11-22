'use client';

import { Spinner } from '@heroui/react';
import { useState } from 'react';
import { Button, InlineAlert } from '@/components/ui';
import { type MeetingFileResponse } from '@/lib/api';
import { MAX_FILES_PER_MEETING } from '@/lib/file-validation';
import { DeleteFileDialog } from './delete-file-dialog';
import { MeetingFileItem } from './meeting-file-item';
import { MeetingFileUpload } from './meeting-file-upload';
import { TranscriptDialog } from './transcript-dialog';
import { useFileDownload } from './use-file-download';
import { useMeetingFiles } from './use-meeting-files';

/** Files of one meeting: upload, list, download and delete (with confirmation). */
export function MeetingFiles({
  meetingId,
  onTranscriptionActiveChange,
  onFilesChange,
}: {
  meetingId: string;
  /** Reports whether some file is still being transcribed. */
  onTranscriptionActiveChange?: (isActive: boolean) => void;
  /** Reports the loaded files, or `null` while they load or failed to load. */
  onFilesChange?: (files: MeetingFileResponse[] | null) => void;
}) {
  const { loadState, reload, handleUploaded, deleteDialog } = useMeetingFiles(
    meetingId,
    { onTranscriptionActiveChange, onFilesChange },
  );
  const { downloadingId, downloadProgress, downloadError, handleDownload } =
    useFileDownload(meetingId);
  const [transcriptFile, setTranscriptFile] =
    useState<MeetingFileResponse | null>(null);

  const files = loadState.status === 'ready' ? loadState.files : null;

  return (
    <section
      aria-labelledby="meeting-files-title"
      className="flex flex-1 flex-col gap-4 rounded-ds-lg border border-ds-line bg-ds-surface p-5 md:rounded-ds-xl md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="meeting-files-title"
          className="text-lg font-bold text-ds-ink md:text-xl"
        >
          Файлы
        </h2>
        {files && (
          <span className="text-[13px] font-semibold text-ds-muted">
            {files.length} из {MAX_FILES_PER_MEETING}
          </span>
        )}
      </div>

      {/* Keyed by meeting: switching meetings remounts the form, which aborts any upload still running for the previous one. */}
      <MeetingFileUpload
        key={meetingId}
        meetingId={meetingId}
        filesCount={files ? files.length : null}
        onUploaded={handleUploaded}
      />

      {downloadError && <InlineAlert>{downloadError}</InlineAlert>}

      {loadState.status === 'loading' && (
        <div role="status" className="flex items-center justify-center py-8">
          <Spinner size="md" aria-label="Загрузка файлов" />
        </div>
      )}

      {loadState.status === 'error' && (
        <InlineAlert
          title="Не удалось загрузить файлы"
          action={
            <Button
              variant="secondary"
              onClick={reload}
              className="self-start px-4 py-2 text-[13px]"
            >
              Повторить
            </Button>
          }
        >
          Проверьте подключение и попробуйте снова.
        </InlineAlert>
      )}

      {files && files.length === 0 && (
        <p className="text-[13px] text-ds-muted">
          Файлов пока нет. Загрузите файл, и он появится здесь.
        </p>
      )}

      {files && files.length > 0 && (
        <ul className="flex flex-col gap-3">
          {files.map((file) => (
            <MeetingFileItem
              key={file.id}
              file={file}
              isDownloading={downloadingId === file.id}
              isDownloadBusy={downloadingId !== null}
              downloadProgress={downloadProgress}
              onDownload={handleDownload}
              onShowTranscript={setTranscriptFile}
              onDelete={deleteDialog.open}
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
        isOpen={deleteDialog.isOpen}
        file={deleteDialog.file}
        isDeleting={deleteDialog.isDeleting}
        error={deleteDialog.error}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={deleteDialog.onConfirm}
      />
    </section>
  );
}
