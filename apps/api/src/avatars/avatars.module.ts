import { BadRequestException, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MulterModule } from '@nestjs/platform-express';
import { mkdir } from 'node:fs/promises';
import { AuthModule } from '../auth/auth.module.js';
import { createUploadMulterOptions } from '../common/uploads/upload-multer-options.js';
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
      useFactory: (config: ConfigService) =>
        createUploadMulterOptions({
          dir: getAvatarsDir(config),
          maxFileBytes: MAX_AVATAR_BYTES,
          maxFormFields: MAX_AVATAR_FORM_FIELDS,
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
})
export class AvatarsModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  /** Creates the avatar directory at startup so uploads never fail on a missing one. */
  async onModuleInit(): Promise<void> {
    await mkdir(getAvatarsDir(this.config), { recursive: true });
  }
}
