import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('User.name migration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps name optional: a user can be created without it', async () => {
    const user = await prisma.user.create({
      data: { email: `user-${randomUUID()}@example.com`, passwordHash: 'x' },
    });

    expect(user.name).toBeNull();
  });

  it('stores and returns a name', async () => {
    const created = await prisma.user.create({
      data: {
        email: `user-${randomUUID()}@example.com`,
        passwordHash: 'x',
        name: 'Анна',
      },
    });

    const found = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(found.name).toBe('Анна');
  });
});
