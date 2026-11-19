import { BadRequestException, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { extname } from 'node:path';
import { AuthModule } from '../auth/auth.module.js';
import {
  isAllowedAvatarType,
  MAX_AVATAR_BYTES,
  MAX_AVATAR_FORM_FIELDS,
} from './avatar.policy.js';
import { AvatarStorage } from './avatar.storage.js';
import { getAvatarsDir } from './avatars.config.js';
import { AvatarsController } from './avatars.controller.js';
import { DeleteAvatarHandler } from './commands/delete-avatar.handler.js';
import { UploadAvatarHandler } from './commands/upload-avatar.handler.js';
import { GetAvatarHandler } from './queries/get-avatar.handler.js';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: diskStorage({
          destination: getAvatarsDir(config),
          // The name on disk is generated, so the client's name never
          // reaches the file system.
          filename: (_req, file, cb) =>
            cb(
              null,
              `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
            ),
        }),
        limits: {
          fileSize: MAX_AVATAR_BYTES,
          files: 1,
          fields: MAX_AVATAR_FORM_FIELDS,
          parts: MAX_AVATAR_FORM_FIELDS + 1,
        },
        // Runs before anything is written, so a rejected type never reaches disk.
        fileFilter: (_req, file, cb) => {
          if (isAllowedAvatarType(file.originalname, file.mimetype)) {
            cb(null, true);
            return;
          }

          cb(
            new BadRequestException(
              'Unsupported file type: use jpg, png or webp',
            ),
            false,
          );
        },
      }),
    }),
  ],
  controllers: [AvatarsController],
  providers: [
    UploadAvatarHandler,
    DeleteAvatarHandler,
    GetAvatarHandler,
    AvatarStorage,
  ],
  exports: [AvatarStorage],
})
export class AvatarsModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  /** Creates the avatar directory at startup so uploads never fail on a missing one. */
  async onModuleInit(): Promise<void> {
    await mkdir(getAvatarsDir(this.config), { recursive: true });
  }
}
