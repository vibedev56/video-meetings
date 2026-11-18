import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UploadMeetingFileCommand } from './commands/upload-meeting-file.command.js';
import type { MeetingFileResult } from './meeting-file.result.js';
import { MaxContentLengthInterceptor } from './max-content-length.interceptor.js';
import { ListMeetingFilesQuery } from './queries/list-meeting-files.query.js';
import { UploadMeetingFileGuard } from './upload-meeting-file.guard.js';

@Controller('meetings/:id/files')
@UseGuards(JwtAuthGuard)
export class MeetingFilesController {
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
}
