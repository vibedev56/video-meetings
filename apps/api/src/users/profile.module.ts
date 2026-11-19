import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module.js';
import { ProfileController } from './profile.controller.js';

/**
 * HTTP side of the profile. It is separate from `UsersModule` so that users
 * stay unaware of tokens: only this module imports `AuthModule` (for
 * `JwtAuthGuard`), and the handlers live in `UsersModule`.
 */
@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
