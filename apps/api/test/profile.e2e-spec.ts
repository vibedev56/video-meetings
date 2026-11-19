import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PASSWORD = 'correct-horse-battery-staple';

describe('Profile (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => app.getHttpServer();

  const registerUser = async (email = `user-${randomUUID()}@example.com`) => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    return { email, token: res.body.accessToken as string };
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /profile', () => {
    it('returns email, empty name and no avatar for a new user', async () => {
      const { email, token } = await registerUser();

      const res = await request(server())
        .get('/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({ email, name: null, hasAvatar: false });
    });

    it('returns 401 without a token', async () => {
      await request(server()).get('/profile').expect(401);
    });

    it('returns 401 for an invalid token', async () => {
      await request(server())
        .get('/profile')
        .set('Authorization', 'Bearer not-a-token')
        .expect(401);
    });

    it('returns the stored name', async () => {
      const { email, token } = await registerUser();
      await app
        .get(PrismaService)
        .user.update({ where: { email }, data: { name: 'Анна' } });

      const res = await request(server())
        .get('/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({ email, name: 'Анна', hasAvatar: false });
    });

    it('returns 404 for a valid token of a deleted user', async () => {
      const { email, token } = await registerUser();
      await app.get(PrismaService).user.delete({ where: { email } });

      await request(server())
        .get('/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it("returns each user's own profile", async () => {
      const first = await registerUser();
      const second = await registerUser();

      const res = await request(server())
        .get('/profile')
        .set('Authorization', `Bearer ${second.token}`)
        .expect(200);

      expect(res.body.email).toBe(second.email);
      expect(res.body.email).not.toBe(first.email);
    });
  });
});
