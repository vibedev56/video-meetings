import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserCredentialsResult } from '../user.result.js';
import { FindUserByEmailQuery } from './find-user-by-email.query.js';

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<
  FindUserByEmailQuery,
  UserCredentialsResult | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindUserByEmailQuery,
  ): Promise<UserCredentialsResult | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: query.email },
    });

    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email, passwordHash: user.passwordHash };
  }
}
