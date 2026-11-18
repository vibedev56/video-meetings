import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserResult } from '../user.result.js';
import { CreateUserCommand } from './create-user.command.js';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<
  CreateUserCommand,
  UserResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateUserCommand): Promise<UserResult> {
    try {
      const user = await this.prisma.user.create({
        data: { email: command.email, passwordHash: command.passwordHash },
      });

      return { id: user.id, email: user.email };
    } catch (error) {
      // Unique constraint on `email`. Covers the race where two registrations
      // with the same e-mail pass the existence check at the same time.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('E-mail is already registered');
      }
      throw error;
    }
  }
}
