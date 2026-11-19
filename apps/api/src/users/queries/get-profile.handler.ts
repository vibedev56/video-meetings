import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProfileResult } from '../user.result.js';
import { GetProfileQuery } from './get-profile.query.js';

@QueryHandler(GetProfileQuery)
export class GetProfileHandler implements IQueryHandler<
  GetProfileQuery,
  ProfileResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProfileQuery): Promise<ProfileResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: query.userId },
      select: { email: true, name: true, avatarFile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      email: user.email,
      name: user.name,
      hasAvatar: user.avatarFile !== null,
    };
  }
}
