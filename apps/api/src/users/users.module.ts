import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module.js';
import { CreateUserHandler } from './commands/create-user.handler.js';
import { UpdateProfileHandler } from './commands/update-profile.handler.js';
import { ProfileController } from './profile.controller.js';
import { FindUserByEmailHandler } from './queries/find-user-by-email.handler.js';
import { GetProfileHandler } from './queries/get-profile.handler.js';

@Module({
  // AuthModule exports JwtAuthGuard, which protects the profile endpoints.
  imports: [CqrsModule, AuthModule],
  controllers: [ProfileController],
  providers: [
    CreateUserHandler,
    FindUserByEmailHandler,
    GetProfileHandler,
    UpdateProfileHandler,
  ],
})
export class UsersModule {}
