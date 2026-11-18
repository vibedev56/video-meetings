import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module.js';
import { MeetingFilesModule } from '../meeting-files/meeting-files.module.js';
import { CreateMeetingHandler } from './commands/create-meeting.handler.js';
import { DeleteMeetingHandler } from './commands/delete-meeting.handler.js';
import { MeetingsController } from './meetings.controller.js';
import { GetMeetingHandler } from './queries/get-meeting.handler.js';
import { ListMeetingsHandler } from './queries/list-meetings.handler.js';

@Module({
  // MeetingFilesModule exports MeetingFileStorage, which removes files on disk
  // when a meeting is deleted.
  imports: [CqrsModule, AuthModule, MeetingFilesModule],
  controllers: [MeetingsController],
  providers: [
    CreateMeetingHandler,
    ListMeetingsHandler,
    GetMeetingHandler,
    DeleteMeetingHandler,
  ],
})
export class MeetingsModule {}
