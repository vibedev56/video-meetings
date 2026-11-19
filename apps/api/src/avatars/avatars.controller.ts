import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { once } from 'node:events';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DeleteAvatarCommand } from './commands/delete-avatar.command.js';
import { UploadAvatarCommand } from './commands/upload-avatar.command.js';
import { MaxAvatarContentLengthInterceptor } from './max-avatar-content-length.interceptor.js';
import type { AvatarFileResult } from './queries/avatar.result.js';
import { GetAvatarQuery } from './queries/get-avatar.query.js';

/** True when If-None-Match lists the ETag (or `*`). */
function matchesEtag(header: string | undefined, etag: string): boolean {
  if (!header) {
    return false;
  }
  return header
    .split(',')
    .map((tag) => tag.trim().replace(/^W\//, ''))
    .some((tag) => tag === '*' || tag === etag);
}

@Controller('profile/avatar')
@UseGuards(JwtAuthGuard)
export class AvatarsController {
  private readonly logger = new Logger(AvatarsController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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

  @Get()
  async download(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const avatar: AvatarFileResult = await this.queryBus.execute(
      new GetAvatarQuery(user.id),
    );

    const headers = {
      ETag: avatar.etag,
      // Stops a browser from guessing a different type, and makes it ask again
      // (with If-None-Match) so a changed avatar is never served from a stale
      // cache.
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache',
    };

    if (matchesEtag(req.headers['if-none-match'], avatar.etag)) {
      res.status(HttpStatus.NOT_MODIFIED).set(headers).end();
      return;
    }

    const stream = createReadStream(avatar.path);
    try {
      // Waiting for 'open' turns a missing file into a 404 before any header
      // is sent.
      await once(stream, 'open');
    } catch {
      throw new NotFoundException('Avatar not found');
    }

    res.set({ ...headers, 'Content-Type': avatar.mimeType });

    pipeline(stream, res, (error) => {
      if (error) {
        this.logger.warn(`Avatar download failed: ${String(error)}`);
      }
    });
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser): Promise<void> {
    await this.commandBus.execute(new DeleteAvatarCommand(user.id));
  }
}
