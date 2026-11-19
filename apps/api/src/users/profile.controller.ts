import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UpdateProfileCommand } from './commands/update-profile.command.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { GetProfileQuery } from './queries/get-profile.query.js';
import type { ProfileResult } from './user.result.js';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<ProfileResult> {
    return this.queryBus.execute(new GetProfileQuery(user.id));
  }

  /** Always changes the caller's own profile; the id comes from the token. */
  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResult> {
    return this.commandBus.execute(new UpdateProfileCommand(user.id, dto.name));
  }
}
