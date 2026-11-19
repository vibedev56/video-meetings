import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const OLD = 'correct-horse-battery-staple';
const NEW = 'another-long-password-42';

describe('POST /auth/password (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => app.getHttpServer();

  const registerUser = async () => {
    const email = `user-${randomUUID()}@example.com`;
    const res = await request(server())
      .post('/auth/register')
      .send({ email, password: OLD })
      .expect(201);
    return { email, token: res.body.accessToken as string };
  };

  const login = (email: string, password: string) =>
    request(server()).post('/auth/login').send({ email, password });

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

  it('changes the password when the old one is correct', async () => {
    const { email, token } = await registerUser();

    await request(server())
      .post('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: OLD, newPassword: NEW })
      .expect(204);

    await login(email, OLD).expect(401);
    await login(email, NEW).expect(200);
  });

  it('returns 401 and keeps the password when the old one is wrong', async () => {
    const { email, token } = await registerUser();

    await request(server())
      .post('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'wrong-password', newPassword: NEW })
      .expect(401);

    await login(email, OLD).expect(200);
  });

  it('returns 401 without a token', async () => {
    await request(server())
      .post('/auth/password')
      .send({ oldPassword: OLD, newPassword: NEW })
      .expect(401);
  });

  it('returns 400 when the new password is shorter than 8 characters', async () => {
    const { email, token } = await registerUser();

    await request(server())
      .post('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: OLD, newPassword: 'short7!' })
      .expect(400);

    await login(email, OLD).expect(200);
  });

  it('accepts a new password of exactly 8 characters', async () => {
    const { token } = await registerUser();

    await request(server())
      .post('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: OLD, newPassword: '12345678' })
      .expect(204);
  });

  it('returns 400 when the new password equals the old one', async () => {
    const { email, token } = await registerUser();

    await request(server())
      .post('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: OLD, newPassword: OLD })
      .expect(400);

    await login(email, OLD).expect(200);
  });

  it('keeps the current token valid after the change', async () => {
    const { token } = await registerUser();

    await request(server())
      .post('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: OLD, newPassword: NEW })
      .expect(204);

    await request(server())
      .get('/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('returns 400 when a field is missing', async () => {
    const { token } = await registerUser();

    await request(server())
      .post('/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: OLD })
      .expect(400);
  });
});
