import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { once } from 'node:events';
import { pipeline } from 'node:stream';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DeleteMeetingFileCommand } from './commands/delete-meeting-file.command.js';
import { UploadMeetingFileCommand } from './commands/upload-meeting-file.command.js';
import { buildAttachmentDisposition } from './content-disposition.js';
import type {
  MeetingFileDownloadResult,
  MeetingFileResult,
} from './meeting-file.result.js';
import { MaxContentLengthInterceptor } from './max-content-length.interceptor.js';
import { GetMeetingFileQuery } from './queries/get-meeting-file.query.js';
import { ListMeetingFilesQuery } from './queries/list-meeting-files.query.js';
import { UploadMeetingFileGuard } from './upload-meeting-file.guard.js';

@Controller('meetings/:id/files')
@UseGuards(JwtAuthGuard)
export class MeetingFilesController {
  private readonly logger = new Logger(MeetingFilesController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(UploadMeetingFileGuard)
  @UseInterceptors(MaxContentLengthInterceptor, FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('id') meetingId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<MeetingFileResult> {
    if (!file) {
      throw new BadRequestException('File is required in the "file" field');
    }

    return this.commandBus.execute(
      new UploadMeetingFileCommand(
        user.id,
        meetingId,
        file.originalname,
        file.filename,
        file.size,
        file.mimetype,
        file.path,
      ),
    );
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('id') meetingId: string,
  ): Promise<MeetingFileResult[]> {
    return this.queryBus.execute(new ListMeetingFilesQuery(user.id, meetingId));
  }

  @Get(':fileId')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') meetingId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file: MeetingFileDownloadResult = await this.queryBus.execute(
      new GetMeetingFileQuery(user.id, meetingId, fileId),
    );

    const stream = createReadStream(file.path);
    try {
      // Waiting for 'open' turns a file removed after the stat check into a 404
      // before any header is sent.
      await once(stream, 'open');
    } catch {
      throw new NotFoundException('File not found');
    }

    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.sizeBytes),
      'Content-Disposition': buildAttachmentDisposition(file.originalName),
    });

    // pipeline destroys the response if the file stream fails mid-way, so the
    // client sees a broken transfer instead of one that hangs.
    pipeline(stream, res, (error) => {
      if (error) {
        this.logger.warn(`Download of ${fileId} failed: ${String(error)}`);
      }
    });
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') meetingId: string,
    @Param('fileId') fileId: string,
  ): Promise<void> {
    await this.commandBus.execute(
      new DeleteMeetingFileCommand(user.id, meetingId, fileId),
    );
  }
}
