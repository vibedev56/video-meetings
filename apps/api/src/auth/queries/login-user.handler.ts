import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service.js';
import { verifyPassword } from '../password.js';
import { AuthTokenResult } from '../auth-token.result.js';
import { LoginUserQuery } from './login-user.query.js';

@QueryHandler(LoginUserQuery)
export class LoginUserHandler implements IQueryHandler<
  LoginUserQuery,
  AuthTokenResult
> {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async execute(query: LoginUserQuery): Promise<AuthTokenResult> {
    const user = await this.users.findByEmail(query.email.trim().toLowerCase());
    const passwordMatches = await verifyPassword(
      query.password,
      user?.passwordHash,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { accessToken };
  }
}
