import { Button, Card } from '@heroui/react';
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
    <li>
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
            {file.transcription && (
              // A live region, so screen readers hear status changes that
              // arrive through polling.
              <div
                role="status"
                aria-live="polite"
                className="flex flex-wrap items-center gap-2"
              >
                <TranscriptionStatusBadge transcription={file.transcription} />
                {file.transcription.status === TranscriptionStatus.FAILED &&
                  file.transcription.error && (
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {file.transcription.error}
                    </span>
                  )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              isDisabled={isDownloadBusy}
              onPress={() => onDownload(file)}
            >
              {downloadLabel(isDownloading, downloadProgress)}
            </Button>
            {file.transcription?.status === TranscriptionStatus.COMPLETED && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onPress={() => onShowTranscript(file)}
              >
                Транскрипция
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="min-h-11"
              onPress={() => onDelete(file)}
            >
              Удалить
            </Button>
          </div>
        </Card.Content>
      </Card>
    </li>
  );
}
