import { QueryBus, QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { UnauthorizedException } from '@nestjs/common';
import { FindUserByEmailQuery } from '../../users/queries/find-user-by-email.query.js';
import type { UserCredentialsResult } from '../../users/user.result.js';
import { AuthTokenService } from '../auth-token.service.js';
import { AuthTokenResult } from '../auth-token.result.js';
import { verifyPassword } from '../password.js';
import { LoginUserQuery } from './login-user.query.js';

@QueryHandler(LoginUserQuery)
export class LoginUserHandler implements IQueryHandler<
  LoginUserQuery,
  AuthTokenResult
> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokens: AuthTokenService,
  ) {}

  async execute(query: LoginUserQuery): Promise<AuthTokenResult> {
    const user = await this.queryBus.execute<
      FindUserByEmailQuery,
      UserCredentialsResult | null
    >(new FindUserByEmailQuery(query.email.trim().toLowerCase()));

    const passwordMatches = await verifyPassword(
      query.password,
      user?.passwordHash,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.tokens.issue(user);
  }
}
