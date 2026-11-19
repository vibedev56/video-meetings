import type { MulterModuleOptions } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

interface UploadMulterConfig {
  dir: string;
  maxFileBytes: number;
  /** Text fields the form may carry besides the file. */
  maxFormFields: number;
  fileFilter: NonNullable<MulterModuleOptions['fileFilter']>;
}

/**
 * Multer settings shared by every single-file upload: generated names on disk
 * (the client's name never reaches the file system) and limits on file size,
 * file count and text fields. Without field and part limits, a chunked request
 * could carry any number of text parts.
 */
export function createUploadMulterOptions(
  config: UploadMulterConfig,
): MulterModuleOptions {
  return {
    storage: diskStorage({
      destination: config.dir,
      filename: (_req, file, cb) =>
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: {
      fileSize: config.maxFileBytes,
      files: 1,
      fields: config.maxFormFields,
      parts: config.maxFormFields + 1,
    },
    // Runs before anything is written, so a rejected type never reaches disk.
    fileFilter: config.fileFilter,
  };
}
