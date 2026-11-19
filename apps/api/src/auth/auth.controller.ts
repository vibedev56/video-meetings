import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
} from './dto/credentials.dto.js';
import { ChangePasswordCommand } from './commands/change-password.command.js';
import { RegisterUserCommand } from './commands/register-user.command.js';
import { LoginUserQuery } from './queries/login-user.query.js';
import { AuthTokenResult } from './auth-token.result.js';
import type { AuthUser } from './auth-user.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthTokenResult> {
    return this.commandBus.execute(
      new RegisterUserCommand(dto.email, dto.password),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthTokenResult> {
    return this.queryBus.execute(new LoginUserQuery(dto.email, dto.password));
  }

  /** Changes the caller's own password; the id comes from the token. */
  @Post('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new ChangePasswordCommand(user.id, dto.oldPassword, dto.newPassword),
    );
  }
}
