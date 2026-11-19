import { UnauthorizedException } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  ICommandHandler,
  QueryBus,
} from '@nestjs/cqrs';
import { UpdatePasswordHashCommand } from '../../users/commands/update-password-hash.command.js';
import { FindUserCredentialsByIdQuery } from '../../users/queries/find-user-credentials-by-id.query.js';
import type { UserCredentialsResult } from '../../users/user.result.js';
import { hashPassword, verifyPassword } from '../password.js';
import { ChangePasswordCommand } from './change-password.command.js';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<
  ChangePasswordCommand,
  void
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.queryBus.execute<
      FindUserCredentialsByIdQuery,
      UserCredentialsResult | null
    >(new FindUserCredentialsByIdQuery(command.userId));

    const oldMatches = await verifyPassword(
      command.oldPassword,
      user?.passwordHash,
    );

    if (!user || !oldMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = await hashPassword(command.newPassword);
    await this.commandBus.execute(
      new UpdatePasswordHashCommand(user.id, passwordHash),
    );
  }
}
