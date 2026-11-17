import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LoginDto, RegisterDto } from './dto/credentials.dto.js';
import { RegisterUserCommand } from './commands/register-user.command.js';
import { LoginUserQuery } from './queries/login-user.query.js';
import { AuthTokenResult } from './auth-token.result.js';

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
}
