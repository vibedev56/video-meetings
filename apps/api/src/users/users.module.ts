import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/create-user.handler.js';
import { UpdatePasswordHashHandler } from './commands/update-password-hash.handler.js';
import { UpdateProfileHandler } from './commands/update-profile.handler.js';
import { FindUserCredentialsByIdHandler } from './queries/find-user-credentials-by-id.handler.js';
import { FindUserByEmailHandler } from './queries/find-user-by-email.handler.js';
import { GetProfileHandler } from './queries/get-profile.handler.js';

@Module({
  imports: [CqrsModule],
  providers: [
    CreateUserHandler,
    FindUserByEmailHandler,
    GetProfileHandler,
    UpdateProfileHandler,
    FindUserCredentialsByIdHandler,
    UpdatePasswordHashHandler,
  ],
})
export class UsersModule {}
