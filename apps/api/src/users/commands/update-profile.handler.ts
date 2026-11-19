import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProfileResult } from '../user.result.js';
import { UpdateProfileCommand } from './update-profile.command.js';

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<
  UpdateProfileCommand,
  ProfileResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateProfileCommand): Promise<ProfileResult> {
    // An empty name resets the field, so the client shows the email again.
    const name = command.name.trim() || null;

    try {
      const user = await this.prisma.user.update({
        where: { id: command.userId },
        data: { name },
        select: { email: true, name: true },
      });

      return {
        email: user.email,
        name: user.name,
        // Avatars are added in a later phase; no user has one yet.
        hasAvatar: false,
      };
    } catch (error) {
      // P2025: the record to update does not exist (for example a deleted user).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
