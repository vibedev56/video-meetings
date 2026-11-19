import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserCredentialsResult } from '../user.result.js';
import { FindUserCredentialsByIdQuery } from './find-user-credentials-by-id.query.js';

@QueryHandler(FindUserCredentialsByIdQuery)
export class FindUserCredentialsByIdHandler implements IQueryHandler<
  FindUserCredentialsByIdQuery,
  UserCredentialsResult | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindUserCredentialsByIdQuery,
  ): Promise<UserCredentialsResult | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: query.userId },
    });

    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email, passwordHash: user.passwordHash };
  }
}
