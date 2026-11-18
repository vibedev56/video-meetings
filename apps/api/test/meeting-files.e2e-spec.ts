import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  MAX_FILES_PER_MEETING,
  MAX_FORM_FIELDS,
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

  const sha256 = (bytes: Buffer) =>
    createHash('sha256').update(bytes).digest('hex');

  /** Collects the raw response body, so binary downloads compare byte for byte. */
  // The parser type comes from supertest, so the callback matches its signature.
  type ResponseParser = Extract<
    Parameters<ReturnType<ReturnType<typeof request>['get']>['parse']>[0],
    (res: never, callback: never) => void
  >;

  const readBinary: ResponseParser = (res, callback) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('error', (err: Error) => callback(err, Buffer.alloc(0)));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  };

  const download = (token: string, meetingId: string, fileId: string) =>
    request(server())
      .get(`/meetings/${meetingId}/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(readBinary);

  const deleteFile = (token: string, meetingId: string, fileId: string) =>
    request(server())
      .delete(`/meetings/${meetingId}/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);

  const deleteMeeting = (token: string, meetingId: string) =>
    request(server())
      .delete(`/meetings/${meetingId}`)
      .set('Authorization', `Bearer ${token}`);

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

    it('keeps a name that was sent only as filename* (RFC 5987) intact', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      const name = 'Запись встречи.mp3';
      const boundary = 'meeting-boundary';
      const body = Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename*=UTF-8''${encodeURIComponent(name)}\r\n` +
          'Content-Type: audio/mpeg\r\n\r\n' +
          'fake media bytes\r\n' +
          `--${boundary}--\r\n`,
      );

      const res = await request(server())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
        .send(body)
        .expect(201);

      expect(res.body.originalName).toBe(name);
    });

    it('returns 400 when the form carries too many text fields, and stores nothing', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      let req = request(server())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake media bytes'), {
          filename: 'standup.mp3',
          contentType: 'audio/mpeg',
        });
      for (let i = 0; i < MAX_FORM_FIELDS + 1; i++) {
        req = req.field(`note${i}`, 'x');
      }

      await req.expect(400);

      expect(await filesOnDisk()).toEqual([]);
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

  describe('GET /meetings/:id/files/:fileId', () => {
    it('returns the stored bytes with the same SHA-256 and a UTF-8 file name', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      const name = 'Запись встречи.mp3';
      const content = randomBytes(4096);

      const uploaded = await upload(token, meetingId, {
        ...MP3,
        name,
        content,
      }).expect(201);

      const res = await download(token, meetingId, uploaded.body.id).expect(
        200,
      );

      expect(sha256(res.body as Buffer)).toBe(sha256(content));
      expect(res.headers['content-type']).toContain('audio/mpeg');
      expect(res.headers['content-length']).toBe(String(content.length));
      expect(res.headers['content-disposition']).toBe(
        `attachment; filename="______ _______.mp3"; filename*=UTF-8''${encodeURIComponent(name)}`,
      );
    });

    it('returns 404 for a file that belongs to another of the user’s meetings', async () => {
      const token = await registerUser();
      const meetingA = await createMeeting(token);
      const meetingB = await createMeeting(token);
      const uploaded = await upload(token, meetingA, MP3).expect(201);

      await download(token, meetingB, uploaded.body.id).expect(404);
    });

    it('returns 404 for a meeting owned by another user', async () => {
      const ownerToken = await registerUser();
      const otherToken = await registerUser();
      const meetingId = await createMeeting(ownerToken);
      const uploaded = await upload(ownerToken, meetingId, MP3).expect(201);

      await download(otherToken, meetingId, uploaded.body.id).expect(404);
    });

    it('returns 404 for an unknown file id', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await download(token, meetingId, randomUUID()).expect(404);
    });

    it('returns 404 when the row exists but the bytes are gone from disk', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      const uploaded = await upload(token, meetingId, MP3).expect(201);
      const [stored] = await filesOnDisk();
      await unlink(join(storageDir, stored));

      await download(token, meetingId, uploaded.body.id).expect(404);
    });

    it('returns 401 without a token', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      const uploaded = await upload(token, meetingId, MP3).expect(201);

      await request(server())
        .get(`/meetings/${meetingId}/files/${uploaded.body.id}`)
        .expect(401);
    });
  });

  describe('DELETE /meetings/:id/files/:fileId', () => {
    it('removes the row and the file on disk, and a later download gives 404', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      const kept = await upload(token, meetingId, MOV).expect(201);
      const removed = await upload(token, meetingId, MP3).expect(201);

      await deleteFile(token, meetingId, removed.body.id).expect(204);

      expect(await filesOnDisk()).toHaveLength(1);
      await download(token, meetingId, removed.body.id).expect(404);
      await download(token, meetingId, kept.body.id).expect(200);
      const list = await listFiles(token, meetingId).expect(200);
      expect(list.body.map((file: { id: string }) => file.id)).toEqual([
        kept.body.id,
      ]);
    });

    it('returns 404 for a meeting owned by another user and leaves the file in place', async () => {
      const ownerToken = await registerUser();
      const otherToken = await registerUser();
      const meetingId = await createMeeting(ownerToken);
      const uploaded = await upload(ownerToken, meetingId, MP3).expect(201);

      await deleteFile(otherToken, meetingId, uploaded.body.id).expect(404);

      expect(await filesOnDisk()).toHaveLength(1);
      const list = await listFiles(ownerToken, meetingId).expect(200);
      expect(list.body).toHaveLength(1);
    });

    it('returns 404 for an unknown file id', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await deleteFile(token, meetingId, randomUUID()).expect(404);
    });

    it('returns 401 without a token', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);
      const uploaded = await upload(token, meetingId, MP3).expect(201);

      await request(server())
        .delete(`/meetings/${meetingId}/files/${uploaded.body.id}`)
        .expect(401);

      expect(await filesOnDisk()).toHaveLength(1);
    });
  });

  describe('DELETE /meetings/:id', () => {
    it('removes the meeting, its files on disk and its rows, and keeps other meetings intact', async () => {
      const token = await registerUser();
      const doomed = await createMeeting(token);
      const survivor = await createMeeting(token);
      await upload(token, doomed, MP3).expect(201);
      await upload(token, doomed, MOV).expect(201);
      const keptFile = await upload(token, survivor, MP3).expect(201);

      await deleteMeeting(token, doomed).expect(204);

      expect(await filesOnDisk()).toHaveLength(1);
      await request(server())
        .get(`/meetings/${doomed}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      await download(token, survivor, keptFile.body.id).expect(200);
    });

    it('returns 404 for a meeting owned by another user and leaves its files in place', async () => {
      const ownerToken = await registerUser();
      const otherToken = await registerUser();
      const meetingId = await createMeeting(ownerToken);
      await upload(ownerToken, meetingId, MP3).expect(201);

      await deleteMeeting(otherToken, meetingId).expect(404);

      expect(await filesOnDisk()).toHaveLength(1);
      await request(server())
        .get(`/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('returns 404 for a meeting that does not exist', async () => {
      const token = await registerUser();

      await deleteMeeting(token, randomUUID()).expect(404);
    });

    it('returns 401 without a token', async () => {
      const token = await registerUser();
      const meetingId = await createMeeting(token);

      await request(server()).delete(`/meetings/${meetingId}`).expect(401);
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
