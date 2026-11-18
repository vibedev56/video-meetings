import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenResult } from './auth-token.result.js';
import { AuthUser } from './auth-user.js';

/** Issues access tokens. Verification lives in `JwtAuthGuard`. */
@Injectable()
export class AuthTokenService {
  constructor(private readonly jwt: JwtService) {}

  async issue(user: AuthUser): Promise<AuthTokenResult> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { accessToken };
  }
}
