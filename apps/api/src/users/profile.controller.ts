import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GetProfileQuery } from './queries/get-profile.query.js';
import type { ProfileResult } from './user.result.js';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<ProfileResult> {
    return this.queryBus.execute(new GetProfileQuery(user.id));
  }
}
