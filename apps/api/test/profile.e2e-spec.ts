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

      expect(res.body).toEqual({
        email,
        name: null,
        hasAvatar: false,
        avatarVersion: null,
      });
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

      expect(res.body).toEqual({
        email,
        name: 'Анна',
        hasAvatar: false,
        avatarVersion: null,
      });
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

  describe('PATCH /profile', () => {
    const patch = (token: string, body: object) =>
      request(server())
        .patch('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const getProfile = (token: string) =>
      request(server()).get('/profile').set('Authorization', `Bearer ${token}`);

    it('saves the name and the profile returns it', async () => {
      const { email, token } = await registerUser();

      const res = await patch(token, { name: 'Анна' }).expect(200);
      expect(res.body).toEqual({
        email,
        name: 'Анна',
        hasAvatar: false,
        avatarVersion: null,
      });

      const profile = await getProfile(token).expect(200);
      expect(profile.body.name).toBe('Анна');
    });

    it('trims surrounding whitespace', async () => {
      const { token } = await registerUser();

      const res = await patch(token, { name: '  Анна  ' }).expect(200);
      expect(res.body.name).toBe('Анна');
    });

    it('resets the name when it is empty', async () => {
      const { token } = await registerUser();
      await patch(token, { name: 'Анна' }).expect(200);

      const res = await patch(token, { name: '' }).expect(200);
      expect(res.body.name).toBeNull();
      expect((await getProfile(token).expect(200)).body.name).toBeNull();
    });

    it('resets the name when it is only whitespace', async () => {
      const { token } = await registerUser();
      await patch(token, { name: 'Анна' }).expect(200);

      const res = await patch(token, { name: '   ' }).expect(200);
      expect(res.body.name).toBeNull();
    });

    it('rejects a name longer than 100 characters', async () => {
      const { token } = await registerUser();

      await patch(token, { name: 'a'.repeat(101) }).expect(400);
      await patch(token, { name: 'a'.repeat(100) }).expect(200);
    });

    it('checks the length after trimming', async () => {
      const { token } = await registerUser();

      const res = await patch(token, { name: ` ${'a'.repeat(100)} ` }).expect(
        200,
      );

      expect(res.body.name).toBe('a'.repeat(100));
    });

    it.each([
      ['a NUL byte', 'a\u0000b'],
      ['a zero-width space', '\u200B'],
      ['a line break inside', 'a\nb'],
      ['a bidi override', 'a\u202Eb'],
    ])('rejects a name with %s', async (_label, name) => {
      const { token } = await registerUser();

      await patch(token, { name }).expect(400);
      expect((await getProfile(token).expect(200)).body.name).toBeNull();
    });

    it('rejects a missing or non-string name', async () => {
      const { token } = await registerUser();

      await patch(token, {}).expect(400);
      await patch(token, { name: 42 }).expect(400);
    });

    it('returns 401 without a token', async () => {
      await request(server()).patch('/profile').send({ name: 'A' }).expect(401);
    });

    it("changes only the caller's own profile", async () => {
      const first = await registerUser();
      const second = await registerUser();

      await patch(second.token, { name: 'Борис' }).expect(200);

      const res = await getProfile(first.token).expect(200);
      expect(res.body.name).toBeNull();
    });

    it('ignores an email or id sent in the body', async () => {
      const first = await registerUser();
      const second = await registerUser();

      const res = await patch(first.token, {
        name: 'Анна',
        email: second.email,
      }).expect(200);

      expect(res.body.email).toBe(first.email);
      expect((await getProfile(second.token)).body.name).toBeNull();
    });

    it('returns 404 for a valid token of a deleted user', async () => {
      const { email, token } = await registerUser();
      await app.get(PrismaService).user.delete({ where: { email } });

      await patch(token, { name: 'Анна' }).expect(404);
    });
  });
});
