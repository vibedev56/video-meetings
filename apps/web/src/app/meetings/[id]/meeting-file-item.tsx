import { Button } from '@/components/ui';
import { TranscriptionStatus, type MeetingFileResponse } from '@/lib/api';
import { formatDateTime, formatFileSize } from '@/lib/format';
import { TranscriptionStatusBadge } from './transcription-status-badge';

interface MeetingFileItemProps {
  file: MeetingFileResponse;
  isDownloading: boolean;
  /** True while any download runs: all download buttons are disabled. */
  isDownloadBusy: boolean;
  downloadProgress: number | null;
  onDownload: (file: MeetingFileResponse) => void;
  onShowTranscript: (file: MeetingFileResponse) => void;
  onDelete: (file: MeetingFileResponse) => void;
}

const ACTION_CLASSES = 'px-3.5 py-2 text-[13px]';

function downloadLabel(isDownloading: boolean, progress: number | null) {
  if (!isDownloading) return 'Скачать';
  return progress !== null ? `Скачивание… ${progress}%` : 'Скачивание…';
}

/** One file of a meeting: name, size, transcription status and actions. */
export function MeetingFileItem({
  file,
  isDownloading,
  isDownloadBusy,
  downloadProgress,
  onDownload,
  onShowTranscript,
  onDelete,
}: MeetingFileItemProps) {
  return (
    <li className="flex flex-col gap-3 rounded-ds-md bg-ds-bg p-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold break-all text-ds-ink">
          {file.originalName}
        </span>
        <span className="text-xs text-ds-muted">
          {formatFileSize(file.sizeBytes)} · {formatDateTime(file.uploadedAt)}
        </span>
        {file.transcription && (
          // A live region, so screen readers hear status changes that
          // arrive through polling.
          <div
            role="status"
            aria-live="polite"
            className="mt-1 flex flex-wrap items-center gap-2"
          >
            <TranscriptionStatusBadge transcription={file.transcription} />
            {file.transcription.status === TranscriptionStatus.FAILED &&
              file.transcription.error && (
                <span className="text-xs text-ds-muted">
                  {file.transcription.error}
                </span>
              )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className={ACTION_CLASSES}
          disabled={isDownloadBusy}
          onClick={() => onDownload(file)}
        >
          {downloadLabel(isDownloading, downloadProgress)}
        </Button>
        {file.transcription?.status === TranscriptionStatus.COMPLETED && (
          <Button
            variant="secondary"
            className={ACTION_CLASSES}
            onClick={() => onShowTranscript(file)}
          >
            Транскрипция
          </Button>
        )}
        <Button
          variant="ghost"
          className={ACTION_CLASSES}
          onClick={() => onDelete(file)}
        >
          Удалить
        </Button>
      </div>
    </li>
  );
}
