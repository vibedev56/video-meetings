import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const PASSWORD = 'correct-horse-battery-staple';

// Every test uses its own e-mail, so tests don't depend on storage state
// left behind by other tests.
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

/**
 * Checks that the value is a JWT (header.payload.signature, base64url JSON)
 * and returns its decoded payload. The signature is not verified here because
 * the signing secret is not available to the e2e suite.
 */
const assertJwt = (token: unknown): Record<string, unknown> => {
  expect(typeof token).toBe('string');

  const parts = (token as string).split('.');
  expect(parts).toHaveLength(3);

  const [header, payload, signature] = parts;
  expect(signature.length).toBeGreaterThan(0);

  const decodedHeader = JSON.parse(
    Buffer.from(header, 'base64url').toString('utf8'),
  );
  expect(decodedHeader).toEqual(
    expect.objectContaining({ alg: expect.any(String) }),
  );

  const decodedPayload = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Record<string, unknown>;
  expect(typeof decodedPayload.sub).toBe('string');

  return decodedPayload;
};

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const register = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/register').send(body);

  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

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

  describe('POST /auth/register', () => {
    it('creates a user and returns a JWT', async () => {
      const res = await register({
        email: uniqueEmail(),
        password: PASSWORD,
      }).expect(201);

      assertJwt(res.body.accessToken);
    });

    it('rejects an e-mail that is already registered with 409', async () => {
      const email = uniqueEmail();

      await register({ email, password: PASSWORD }).expect(201);
      await register({ email, password: 'another-password' }).expect(409);
    });

    it.each([
      ['e-mail is missing', { password: PASSWORD }],
      ['password is missing', { email: uniqueEmail() }],
      ['e-mail is malformed', { email: 'not-an-email', password: PASSWORD }],
      ['body is empty', {}],
    ])('returns 400 when %s', async (_name, body) => {
      const res = await register(body).expect(400);

      expect(res.body.accessToken).toBeUndefined();
    });
  });

  describe('POST /auth/login', () => {
    it('returns a JWT for a registered user', async () => {
      const email = uniqueEmail();
      await register({ email, password: PASSWORD }).expect(201);

      const res = await login({ email, password: PASSWORD }).expect(200);

      assertJwt(res.body.accessToken);
    });

    it('finds the existing user rather than creating a new one', async () => {
      const email = uniqueEmail();
      const registerRes = await register({ email, password: PASSWORD }).expect(
        201,
      );
      const loginRes = await login({ email, password: PASSWORD }).expect(200);

      const registeredUser = assertJwt(registerRes.body.accessToken);
      const loggedInUser = assertJwt(loginRes.body.accessToken);

      expect(loggedInUser.sub).toBe(registeredUser.sub);
    });

    it('returns 401 and no token when the password is wrong', async () => {
      const email = uniqueEmail();
      await register({ email, password: PASSWORD }).expect(201);

      const res = await login({ email, password: 'wrong-password' }).expect(
        401,
      );

      expect(res.body.accessToken).toBeUndefined();
    });

    it('returns 401 and no token when the e-mail is not registered', async () => {
      const res = await login({
        email: uniqueEmail(),
        password: PASSWORD,
      }).expect(401);

      expect(res.body.accessToken).toBeUndefined();
    });

    it('does not create a user when logging in with an unknown e-mail', async () => {
      const email = uniqueEmail();

      await login({ email, password: PASSWORD }).expect(401);

      // If the failed login had created the user, this would be 409.
      await register({ email, password: PASSWORD }).expect(201);
    });

    it.each([
      ['e-mail is missing', { password: PASSWORD }],
      ['password is missing', { email: uniqueEmail() }],
      ['e-mail is malformed', { email: 'not-an-email', password: PASSWORD }],
      ['body is empty', {}],
    ])('returns 400 when %s', async (_name, body) => {
      const res = await login(body).expect(400);

      expect(res.body.accessToken).toBeUndefined();
    });
  });
});
