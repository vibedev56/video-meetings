import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AvatarsModule } from './avatars/avatars.module.js';
import { MeetingFilesModule } from './meeting-files/meeting-files.module.js';
import { MeetingsModule } from './meetings/meetings.module.js';
import { TranscriptionsModule } from './transcriptions/transcriptions.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProfileModule } from './users/profile.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    ProfileModule,
    AuthModule,
    MeetingsModule,
    MeetingFilesModule,
    AvatarsModule,
    TranscriptionsModule,
    AiAnalysisModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe({ whitelist: true }),
    },
  ],
})
export class AppModule {}
