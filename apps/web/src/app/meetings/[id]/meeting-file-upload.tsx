'use client';

import { Alert, Button, ProgressBar } from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
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
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-zinc-300 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/60'
        }`}
      >
        {uploadState.status === 'uploading' ? (
          <div className="flex w-full flex-col gap-3">
            <p className="break-all font-medium text-zinc-950 dark:text-zinc-50">
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
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Загрузка… {uploadState.progress}%
                </p>
                <Button
                  variant="outline"
                  className="min-h-11 self-center"
                  onPress={() => abortRef.current?.abort()}
                >
                  Отменить
                </Button>
              </>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Файл передан, сервер сохраняет его…
              </p>
            )}
          </div>
        ) : isFull ? (
          <p className="text-zinc-700 dark:text-zinc-300">
            {FULL_MEETING_MESSAGE}
          </p>
        ) : (
          <>
            <p className="text-zinc-700 dark:text-zinc-300">
              Перетащите файл сюда или выберите его на устройстве.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              mp3, wav, m4a, ogg, mp4, webm, mov · до 500 МБ · один файл за раз
            </p>
            <Button
              variant="primary"
              className="min-h-11"
              onPress={() => inputRef.current?.click()}
            >
              Выбрать файл
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          hidden
          aria-label="Файл встречи"
        />
      </div>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
    </div>
  );
}
