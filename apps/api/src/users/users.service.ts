import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(email: string, passwordHash: string) {
    try {
      return await this.prisma.user.create({
        data: { email, passwordHash },
      });
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
