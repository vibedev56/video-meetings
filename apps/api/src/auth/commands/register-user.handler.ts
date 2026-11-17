import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service.js';
import { hashPassword } from '../password.js';
import { AuthTokenResult } from '../auth-token.result.js';
import { RegisterUserCommand } from './register-user.command.js';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  AuthTokenResult
> {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthTokenResult> {
    const passwordHash = await hashPassword(command.password);
    const user = await this.users.create(
      command.email.trim().toLowerCase(),
      passwordHash,
    );

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { accessToken };
  }
}
