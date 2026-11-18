import { BadRequestException, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { extname } from 'node:path';
import { AuthModule } from '../auth/auth.module.js';
import { DeleteMeetingFileHandler } from './commands/delete-meeting-file.handler.js';
import { UploadMeetingFileHandler } from './commands/upload-meeting-file.handler.js';
import { MeetingFileStorage } from './meeting-file.storage.js';
import {
  decodeMultipartFilename,
  isAllowedMeetingFileType,
  MAX_FILE_SIZE_BYTES,
  MAX_FORM_FIELDS,
} from './meeting-file.policy.js';
import { getMeetingFilesDir } from './meeting-files.config.js';
import { MeetingFilesController } from './meeting-files.controller.js';
import { AssertCanUploadMeetingFileHandler } from './queries/assert-can-upload-meeting-file.handler.js';
import { GetMeetingFileHandler } from './queries/get-meeting-file.handler.js';
import { ListMeetingFilesHandler } from './queries/list-meeting-files.handler.js';
import { UploadMeetingFileGuard } from './upload-meeting-file.guard.js';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: diskStorage({
          destination: getMeetingFilesDir(config),
          // The name on disk is generated, so the client's name never
          // reaches the file system.
          filename: (_req, file, cb) =>
            cb(
              null,
              `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
            ),
        }),
        // Without field and part limits, a chunked request could carry any number
        // of text parts. Each text field is also capped at 1 MB (busboy default).
        limits: {
          fileSize: MAX_FILE_SIZE_BYTES,
          files: 1,
          fields: MAX_FORM_FIELDS,
          parts: MAX_FORM_FIELDS + 1,
        },
        // Runs before anything is written, so a rejected type never reaches disk.
        fileFilter: (_req, file, cb) => {
          file.originalname = decodeMultipartFilename(file.originalname);
          if (isAllowedMeetingFileType(file.originalname, file.mimetype)) {
            cb(null, true);
            return;
          }

          cb(
            new BadRequestException(
              'Unsupported file type: use mp3, wav, m4a, ogg, mp4, webm or mov',
            ),
            false,
          );
        },
      }),
    }),
  ],
  controllers: [MeetingFilesController],
  providers: [
    UploadMeetingFileHandler,
    ListMeetingFilesHandler,
    AssertCanUploadMeetingFileHandler,
    GetMeetingFileHandler,
    DeleteMeetingFileHandler,
    UploadMeetingFileGuard,
    MeetingFileStorage,
  ],
  exports: [MeetingFileStorage],
})
export class MeetingFilesModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  /** Creates the storage directory at startup so uploads never fail on a missing one. */
  async onModuleInit(): Promise<void> {
    await mkdir(getMeetingFilesDir(this.config), { recursive: true });
  }
}
