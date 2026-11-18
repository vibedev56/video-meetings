import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  MAX_FILES_PER_MEETING,
  MAX_REQUEST_BYTES,
} from '../src/meeting-files/meeting-file.policy.js';

const PASSWORD = 'correct-horse-battery-staple';
const uniqueEmail = () => `user-${randomUUID()}@example.com`;
const inDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const MP3 = { name: 'standup.mp3', type: 'audio/mpeg' };
const MOV = { name: 'demo.mov', type: 'video/quicktime' };

describe('Meeting files (e2e)', () => {
  let app: INestApplication<App>;
  let storageDir: string;
  const previousDir = process.env.MEETING_FILES_DIR;

  const server = () => app.getHttpServer();

  const registerUser = async (): Promise<string> => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(201);

    return res.body.accessToken as string;
  };

  const createMeeting = async (token: string): Promise<string> => {
    const res = await request(server())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sprint planning', date: inDays(3), participants: [] })
      .expect(201);

    return res.body.id as string;
  };

  const upload = (
    token: string,
    meetingId: string,
    file: { name: string; type: string; content?: Buffer },
  ) =>
    request(server())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file.content ?? Buffer.from('fake media bytes'), {
        filename: file.name,
        contentType: file.type,
      });

  const listFiles = (token: string, meetingId: string) =>
    request(server())
      .get(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`);

  const filesOnDisk = () => readdir(storageDir);

  beforeEach(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'meeting-files-'));
    process.env.MEETING_FILES_DIR = storageDir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(storageDir, { recursive: true, force: true });
  });

  afterAll(() => {
    if (previousDir === undefined) {
      delete process.env.MEETING_FILES_DIR;
    } else {
      process.env.MEETING_FILES_DIR = previousDir;
    }
  });

  describe('POST /meetings/:id/files', () => {
    it.each([MP3, MOV])(
      'stores $name and returns it with 201',
      async (file) => {
        const token = await registerUser();
        const meetingId = await createMeeting(token);

        const res = await upload(token, meetingId, file).expect(201);

        expect(res.body).toEqual({
          id: expect.any(String),
          originalName: file.name,
          sizeBytes: Buffer.byteLength('fake media bytes'),
          mimeType: file.type,
          uploadedAt: expect.any(String),
        });
        expect(res.body).not.toHaveProperty('storedName');

        const [stored] = await filesOnDisk();
        expect(stored).toBeDefined();
        expect(stored).not.toBe(file.name);

        const list = await listFiles(token, meetingId).expect(200);
        expect(list.body).toEqual([
          expect.objectContaining({ id: res.body.id }),
        ]);
      },
    );

    it('keeps a non-ASCII original name intact', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      const name = 'Запись встречи.mp3';

      const res = await upload(token, meetingId, { ...MP3, name }).expect(201);

      expect(res.body.originalName).toBe(name);
    });

    it('returns 400 for an unsupported extension and stores nothing', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await upload(token, meetingId, {
        name: 'notes.pdf',
        type: 'application/pdf',
      }).expect(400);

      expect(await filesOnDisk()).toEqual([]);
      const list = await listFiles(token, meetingId).expect(200);
      expect(list.body).toEqual([]);
    });

    it('returns 400 when the MIME type does not match the extension', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await upload(token, meetingId, {
        name: 'standup.mp3',
        type: 'video/quicktime',
      }).expect(400);

      expect(await filesOnDisk()).toEqual([]);
    });

    it('returns 400 when no file field is sent', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await request(server())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .field('comment', 'no file here')
        .expect(400);

      expect(await filesOnDisk()).toEqual([]);
    });

    it('returns 413 when Content-Length exceeds the limit, before the body is stored', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await request(server())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'multipart/form-data; boundary=x')
        .set('Content-Length', String(MAX_REQUEST_BYTES + 1))
        .send(Buffer.from('--x--'))
        .expect(413);

      expect(await filesOnDisk()).toEqual([]);
    });

    it('returns 409 for the sixth file and leaves the first five untouched', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      for (let i = 0; i < MAX_FILES_PER_MEETING; i++) {
        await upload(token, meetingId, MP3).expect(201);
      }

      await upload(token, meetingId, MOV).expect(409);

      expect(await filesOnDisk()).toHaveLength(MAX_FILES_PER_MEETING);
      const list = await listFiles(token, meetingId).expect(200);
      expect(list.body).toHaveLength(MAX_FILES_PER_MEETING);
    });

    it('returns 404 for a meeting owned by another user and stores nothing', async () => {
      const ownerToken = await registerUser();
      const otherToken = await registerUser();
      const meetingId = await createMeeting(ownerToken);

      await upload(otherToken, meetingId, MP3).expect(404);

      expect(await filesOnDisk()).toEqual([]);
    });

    it('returns 404 for a meeting that does not exist', async () => {
      const token = await registerUser();

      await upload(token, randomUUID(), MP3).expect(404);
    });

    it('returns 401 without a token and stores nothing', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await request(server())
        .post(`/meetings/${meetingId}/files`)
        .attach('file', Buffer.from('x'), { filename: 'standup.mp3' })
        .expect(401);

      expect(await filesOnDisk()).toEqual([]);
    });

    it('returns 401 with an invalid token', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await request(server())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', 'Bearer not-a-real-token')
        .attach('file', Buffer.from('x'), { filename: 'standup.mp3' })
        .expect(401);

      expect(await filesOnDisk()).toEqual([]);
    });
  });

  describe('GET /meetings/:id/files', () => {
    it('lists the files of the meeting in upload order', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      const first = await upload(token, meetingId, MP3).expect(201);
      const second = await upload(token, meetingId, MOV).expect(201);

      const res = await listFiles(token, meetingId).expect(200);

      expect(res.body.map((file: { id: string }) => file.id)).toEqual([
        first.body.id,
        second.body.id,
      ]);
    });

    it('returns an empty array for a meeting without files', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      const res = await listFiles(token, meetingId).expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 404 for a meeting owned by another user', async () => {
      const ownerToken = await registerUser();
      const otherToken = await registerUser();
      const meetingId = await createMeeting(ownerToken);
      await upload(ownerToken, meetingId, MP3).expect(201);

      await listFiles(otherToken, meetingId).expect(404);
    });

    it('returns 401 without a token', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await request(server()).get(`/meetings/${meetingId}/files`).expect(401);
    });

    it('returns 401 with an invalid token', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await request(server())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });

  it('creates the storage directory at startup when it is missing', async () => {
    await app.close();
    await rm(storageDir, { recursive: true, force: true });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    expect((await stat(storageDir)).isDirectory()).toBe(true);
  });
});
