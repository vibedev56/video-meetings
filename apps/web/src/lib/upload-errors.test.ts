import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { uploadErrorMessage } from './upload-errors';

describe('uploadErrorMessage', () => {
  it('explains an unsupported format for 400', () => {
    expect(uploadErrorMessage(new ApiError(400, 'bad'))).toMatch(
      /Этот формат не поддерживается/,
    );
  });

  it('explains the size limit for 413', () => {
    expect(uploadErrorMessage(new ApiError(413, 'big'))).toBe(
      'Файл больше 500 МБ. Выберите файл меньшего размера.',
    );
  });

  it('explains the file limit for 409', () => {
    expect(uploadErrorMessage(new ApiError(409, 'full'))).toMatch(
      /максимум файлов \(5\)/,
    );
  });

  it('explains a dropped connection for status 0', () => {
    expect(uploadErrorMessage(new ApiError(0, 'offline'))).toMatch(
      /Соединение прервано/,
    );
  });

  it.each([500, 502, 503])('explains a server failure for %i', (status) => {
    expect(uploadErrorMessage(new ApiError(status, 'boom'))).toMatch(
      /Сервер не смог сохранить файл/,
    );
  });

  it('falls back to a generic message for other statuses', () => {
    expect(uploadErrorMessage(new ApiError(418, 'teapot'))).toBe(
      'Не удалось загрузить файл. Попробуйте снова.',
    );
  });

  it('falls back to a generic message for non-API errors', () => {
    expect(uploadErrorMessage(new Error('unexpected'))).toBe(
      'Не удалось загрузить файл. Попробуйте снова.',
    );
  });
});
