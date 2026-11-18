import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const PASSWORD = 'correct-horse-battery-staple';

// Every test uses its own users and meetings, so tests don't depend on
// storage state left behind by other tests.
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

const inDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

describe('Meetings (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => app.getHttpServer();

  /** Registers a new user through the real auth endpoint and returns its token. */
  const registerUser = async (): Promise<string> => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(201);

    return res.body.accessToken as string;
  };

  const createMeeting = (token: string, body: Record<string, unknown>) =>
    request(server())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const listMeetings = (token: string) =>
    request(server()).get('/meetings').set('Authorization', `Bearer ${token}`);

  const getMeeting = (token: string, id: string) =>
    request(server())
      .get(`/meetings/${id}`)
      .set('Authorization', `Bearer ${token}`);

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

  describe('POST /meetings', () => {
    it('creates a meeting for the authenticated user and returns it with 201', async () => {
      const token = await registerUser();
      const date = inDays(3);
      const participants = [uniqueEmail(), uniqueEmail()];

      const res = await createMeeting(token, {
        title: 'Sprint planning',
        date,
        participants,
      }).expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Sprint planning',
          participants,
        }),
      );
      expect(new Date(res.body.date).getTime()).toBe(new Date(date).getTime());
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(server())
        .post('/meetings')
        .send({ title: 'Sprint planning', date: inDays(3), participants: [] })
        .expect(401);

      expect(res.body.id).toBeUndefined();
    });

    it.each([
      ['title is missing', { date: inDays(3), participants: [] }],
      ['date is missing', { title: 'Sprint planning', participants: [] }],
      [
        'date is malformed',
        { title: 'Sprint planning', date: 'tomorrow', participants: [] },
      ],
      [
        'participants is not an array',
        { title: 'Sprint planning', date: inDays(3), participants: 'someone' },
      ],
      ['body is empty', {}],
    ])('returns 400 when %s', async (_name, body) => {
      const token = await registerUser();

      await createMeeting(token, body).expect(400);
    });
  });

  describe('GET /meetings', () => {
    it("returns the current user's meetings", async () => {
      const token = await registerUser();

      const first = await createMeeting(token, {
        title: 'Standup',
        date: inDays(1),
        participants: [],
      }).expect(201);
      const second = await createMeeting(token, {
        title: 'Retro',
        date: inDays(2),
        participants: [uniqueEmail()],
      }).expect(201);

      const res = await listMeetings(token).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((meeting: { id: string }) => meeting.id);
      expect(ids).toEqual(
        expect.arrayContaining([first.body.id, second.body.id]),
      );
    });

    it('does not return meetings that belong to other users', async () => {
      const ownerToken = await registerUser();
      const otherToken = await registerUser();

      const foreign = await createMeeting(otherToken, {
        title: 'Not yours',
        date: inDays(1),
        participants: [],
      }).expect(201);

      const res = await listMeetings(ownerToken).expect(200);

      const ids = res.body.map((meeting: { id: string }) => meeting.id);
      expect(ids).not.toContain(foreign.body.id);
    });

    it('returns an empty array when the user has no meetings', async () => {
      const token = await registerUser();

      const res = await listMeetings(token).expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 401 when no token is provided', async () => {
      await request(server()).get('/meetings').expect(401);
    });
  });

  describe('GET /meetings/:id', () => {
    it('returns the meeting with the given id', async () => {
      const token = await registerUser();
      const created = await createMeeting(token, {
        title: 'Design review',
        date: inDays(5),
        participants: [uniqueEmail()],
      }).expect(201);

      const res = await getMeeting(token, created.body.id).expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: created.body.id,
          title: 'Design review',
          participants: created.body.participants,
        }),
      );
    });

    it('returns 404 when the meeting does not exist', async () => {
      const token = await registerUser();

      const res = await getMeeting(token, randomUUID()).expect(404);

      // A missing route also returns 404, but with a "Cannot GET ..." message.
      // Checking the message makes sure the 404 comes from the meeting lookup.
      expect(res.body.message).toMatch(/not found/i);
    });

    it('returns 401 when no token is provided', async () => {
      await request(server()).get(`/meetings/${randomUUID()}`).expect(401);
    });
  });
});
