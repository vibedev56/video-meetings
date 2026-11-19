import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UploadAvatarCommand } from './commands/upload-avatar.command.js';
import { MaxAvatarContentLengthInterceptor } from './max-avatar-content-length.interceptor.js';

@Controller('profile/avatar')
@UseGuards(JwtAuthGuard)
export class AvatarsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(MaxAvatarContentLengthInterceptor, FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ hasAvatar: true }> {
    if (!file) {
      throw new BadRequestException('File is required in the "file" field');
    }

    return this.commandBus.execute(
      new UploadAvatarCommand(user.id, file.filename, file.path),
    );
  }
}
