import { ApiError } from './api';
import { MAX_FILE_SIZE_BYTES } from './file-validation';

export const NETWORK_UPLOAD_MESSAGE =
  'Соединение прервано. Проверьте подключение и попробуйте загрузить файл снова.';

/**
 * Russian message for a failed upload, keyed by the HTTP status the API returns.
 * Cancelling is not an error and must be handled by the caller before this.
 */
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        return NETWORK_UPLOAD_MESSAGE;
      case 400:
        return 'Этот формат не поддерживается. Выберите файл в формате mp3, wav, m4a, ogg, mp4, webm или mov.';
      case 409:
        return 'У встречи уже максимум файлов (5). Удалите ненужный файл, чтобы загрузить новый.';
      case 413:
        return `Файл больше ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} МБ. Выберите файл меньшего размера.`;
    }
    if (error.status >= 500) {
      return 'Сервер не смог сохранить файл. Попробуйте загрузить его позже.';
    }
  }
  return 'Не удалось загрузить файл. Попробуйте снова.';
}
