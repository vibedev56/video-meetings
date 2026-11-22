'use client';

import { ProgressBar } from '@heroui/react';
import { CloudUpload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { Button, buttonClasses, InlineAlert } from '@/components/ui';
import { uploadMeetingFile, type MeetingFileResponse } from '@/lib/api';
import {
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILES_PER_MEETING,
  validateMeetingFile,
} from '@/lib/file-validation';
import { uploadErrorMessage } from '@/lib/upload-errors';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';

const ONE_FILE_MESSAGE =
  'За один раз загружается один файл. Выберите один файл.';

const FULL_MEETING_MESSAGE = `У встречи уже ${MAX_FILES_PER_MEETING} файлов, это максимум. Удалите ненужный файл, чтобы загрузить новый.`;

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string; progress: number };

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Upload form for one meeting: pick a file with the dialog or drag it onto the
 * drop zone. One file at a time, checked in the browser before sending.
 *
 * `filesCount` is the number of files the meeting already has, or `null` while
 * the list is still loading. A full meeting gets no upload controls.
 */
export function MeetingFileUpload({
  meetingId,
  filesCount,
  onUploaded,
}: {
  meetingId: string;
  filesCount: number | null;
  onUploaded: (file: MeetingFileResponse) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
  });
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Cancel a running upload if the user leaves the page.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const isUploading = uploadState.status === 'uploading';
  const isFull = filesCount !== null && filesCount >= MAX_FILES_PER_MEETING;

  async function startUpload(file: File) {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    if (isFull) {
      setError(FULL_MEETING_MESSAGE);
      return;
    }

    const validationError = validateMeetingFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setUploadState({ status: 'uploading', fileName: file.name, progress: 0 });

    try {
      const saved = await uploadMeetingFile(token, meetingId, file, {
        signal: controller.signal,
        onProgress: (progress) =>
          setUploadState((current) =>
            current.status === 'uploading' ? { ...current, progress } : current,
          ),
      });
      onUploaded(saved);
    } catch (uploadError) {
      // A cancelled upload is not an error: the list stays as it was.
      if (isAbortError(uploadError)) {
        return;
      }
      if (redirectToLoginIfUnauthorized(uploadError, router)) {
        return;
      }
      setError(uploadErrorMessage(uploadError));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setUploadState({ status: 'idle' });
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || isUploading) {
      return;
    }
    if (files.length > 1) {
      setError(ONE_FILE_MESSAGE);
      return;
    }
    startUpload(files[0]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    // Clear the input so the same file can be picked again after an error.
    event.target.value = '';
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isUploading && !isFull) {
      setIsDragOver(true);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        data-drag-over={isDragOver || undefined}
        className={`flex flex-col items-center justify-center gap-3 rounded-ds-lg border border-dashed px-5 py-7 text-center transition-colors ${
          isDragOver
            ? 'border-ds-accent bg-ds-accent-soft'
            : 'border-ds-line-strong bg-ds-bg'
        }`}
      >
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="peer sr-only"
          aria-label="Файл встречи"
        />
        {uploadState.status === 'uploading' ? (
          <div className="flex w-full flex-col gap-3">
            <p className="text-sm font-semibold break-all text-ds-ink">
              {uploadState.fileName}
            </p>
            <ProgressBar
              aria-label="Прогресс загрузки"
              value={uploadState.progress}
              className="w-full"
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
            {/* Once every byte is sent the server is saving the file. Cancelling
                then could leave a stored file that the list never shows, so the
                button goes away at 100%. */}
            {uploadState.progress < 100 ? (
              <>
                <p className="text-[13px] text-ds-muted">
                  Загрузка… {uploadState.progress}%
                </p>
                <Button
                  variant="secondary"
                  className="self-center"
                  onClick={() => abortRef.current?.abort()}
                >
                  Отменить
                </Button>
              </>
            ) : (
              <p className="text-[13px] text-ds-muted">
                Файл передан, сервер сохраняет его…
              </p>
            )}
          </div>
        ) : isFull ? (
          <p className="text-sm text-ds-ink">{FULL_MEETING_MESSAGE}</p>
        ) : (
          <>
            <span
              aria-hidden
              className="flex size-12 items-center justify-center rounded-[14px] bg-ds-accent-soft text-ds-accent"
            >
              <CloudUpload className="size-[22px]" />
            </span>
            <p className="text-sm leading-[1.4] font-semibold text-ds-ink">
              Перетащите файл сюда или выберите его на устройстве
            </p>
            <p className="text-xs leading-[1.4] text-ds-muted">
              mp3, wav, m4a, ogg, mp4, webm, mov · до 500 МБ · один файл за раз
            </p>
            {/* A native label opens the file picker in every browser without
                scripting, unlike a programmatic input.click() from a press
                handler. The input stays focusable for the keyboard. */}
            <label
              htmlFor={inputId}
              className={`${buttonClasses('primary')} cursor-pointer peer-focus-visible:shadow-ds-ring`}
            >
              Выбрать файл
            </label>
          </>
        )}
      </div>

      {error && <InlineAlert>{error}</InlineAlert>}
    </div>
  );
}
