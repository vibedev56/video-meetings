import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand } from '../../users/commands/create-user.command.js';
import type { UserResult } from '../../users/user.result.js';
import { AuthTokenService } from '../auth-token.service.js';
import { AuthTokenResult } from '../auth-token.result.js';
import { hashPassword } from '../password.js';
import { RegisterUserCommand } from './register-user.command.js';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  AuthTokenResult
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly tokens: AuthTokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthTokenResult> {
    const passwordHash = await hashPassword(command.password);
    const user = await this.commandBus.execute<CreateUserCommand, UserResult>(
      new CreateUserCommand(command.email.trim().toLowerCase(), passwordHash),
    );

    return this.tokens.issue(user);
  }
}
