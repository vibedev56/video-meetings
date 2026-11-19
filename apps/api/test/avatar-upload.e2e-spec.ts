import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import {
  MAX_AVATAR_BYTES,
  MAX_AVATAR_REQUEST_BYTES,
} from '../src/avatars/avatar.policy.js';
import {
  JPEG_BYTES,
  PNG_BYTES,
  pngOfSize,
  WEBP_BYTES,
} from './support/avatar-fixtures.js';

const PASSWORD = 'correct-horse-battery-staple';
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

const contentFor = (name: string): Buffer =>
  name.endsWith('.webp')
    ? WEBP_BYTES
    : name.endsWith('.png')
      ? PNG_BYTES
      : JPEG_BYTES;

const PNG = { name: 'me.png', type: 'image/png' };

describe('Avatar upload (e2e)', () => {
  let app: INestApplication<App>;
  let dir: string;
  const previousDir = process.env.AVATARS_DIR;

  const server = () => app.getHttpServer();

  const registerUser = async (): Promise<string> => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email: uniqueEmail(), password: PASSWORD })
      .expect(201);
    return res.body.accessToken as string;
  };

  const upload = (
    token: string | null,
    file: { name: string; type: string; content?: Buffer },
  ) => {
    const req = request(server()).put('/profile/avatar');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.attach('file', file.content ?? contentFor(file.name), {
      filename: file.name,
      contentType: file.type,
    });
  };

  const profile = (token: string) =>
    request(server()).get('/profile').set('Authorization', `Bearer ${token}`);

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'avatars-'));
    process.env.AVATARS_DIR = dir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
    if (previousDir === undefined) delete process.env.AVATARS_DIR;
    else process.env.AVATARS_DIR = previousDir;
  });

  it.each([
    ['me.jpg', 'image/jpeg'],
    ['me.png', 'image/png'],
    ['me.webp', 'image/webp'],
  ])('accepts %s', async (name, type) => {
    const token = await registerUser();

    const res = await upload(token, { name, type }).expect(200);

    expect(res.body).toEqual({ hasAvatar: true });
    const body = (await profile(token)).body;
    expect(body.hasAvatar).toBe(true);
    expect(body.avatarVersion).toEqual(expect.any(String));
    expect(await readdir(dir)).toHaveLength(1);
  });

  it('rejects an unsupported format with 400 and leaves the disk empty', async () => {
    const token = await registerUser();

    await upload(token, { name: 'me.gif', type: 'image/gif' }).expect(400);

    expect(await readdir(dir)).toEqual([]);
    expect((await profile(token)).body.hasAvatar).toBe(false);
  });

  it('rejects a mismatching extension and MIME type', async () => {
    const token = await registerUser();

    await upload(token, { name: 'me.png', type: 'text/html' }).expect(400);

    expect(await readdir(dir)).toEqual([]);
  });

  it('rejects a missing file with 400', async () => {
    const token = await registerUser();

    await request(server())
      .put('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .field('other', 'x')
      .expect(400);
  });

  it('rejects a file over 2 MB with 413 and keeps the current avatar', async () => {
    const token = await registerUser();
    await upload(token, PNG).expect(200);
    const before = await readdir(dir);

    await upload(token, {
      ...PNG,
      content: pngOfSize(MAX_AVATAR_BYTES + 1),
    }).expect(413);

    expect(await readdir(dir)).toEqual(before);
    expect((await profile(token)).body.hasAvatar).toBe(true);
  });

  it('rejects a body over the request limit by Content-Length with 413', async () => {
    const token = await registerUser();
    await upload(token, PNG).expect(200);
    const before = await readdir(dir);

    // The interceptor refuses from the header alone, before multer reads
    // anything, so the declared length is all that matters here.
    const res = await request(server())
      .put('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Length', String(MAX_AVATAR_REQUEST_BYTES + 1))
      .set('Content-Type', 'multipart/form-data; boundary=x')
      .send('x')
      .catch((error: { response?: request.Response }) => error.response);

    expect(res?.status).toBe(413);
    expect(res?.headers['connection']).toBe('close');
    expect(await readdir(dir)).toEqual(before);
  });

  it('rejects a file whose content is not its format and keeps the avatar', async () => {
    const token = await registerUser();
    await upload(token, PNG).expect(200);
    const before = await readdir(dir);

    await upload(token, {
      ...PNG,
      content: Buffer.from('<html>not a png</html>'),
    }).expect(400);

    expect(await readdir(dir)).toEqual(before);
    expect((await profile(token)).body.hasAvatar).toBe(true);
  });

  it('rejects a real jpeg that is named .png', async () => {
    const token = await registerUser();

    await upload(token, { ...PNG, content: JPEG_BYTES }).expect(400);

    expect(await readdir(dir)).toEqual([]);
    expect((await profile(token)).body.hasAvatar).toBe(false);
  });

  it('accepts a file of exactly 2 MB', async () => {
    const token = await registerUser();

    await upload(token, {
      ...PNG,
      content: pngOfSize(MAX_AVATAR_BYTES),
    }).expect(200);
  });

  it('replaces the avatar and removes the old file from disk', async () => {
    const token = await registerUser();
    await upload(token, PNG).expect(200);
    const [first] = await readdir(dir);
    const versionBefore = (await profile(token)).body.avatarVersion;

    await upload(token, { name: 'me.webp', type: 'image/webp' }).expect(200);

    expect((await profile(token)).body.avatarVersion).not.toBe(versionBefore);
    const after = await readdir(dir);
    expect(after).toHaveLength(1);
    expect(after[0]).not.toBe(first);
  });

  it('returns 401 without a token and writes nothing', async () => {
    await upload(null, PNG).expect(401);

    expect(await readdir(dir)).toEqual([]);
  });

  it("does not touch another user's avatar", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    await upload(alice, PNG).expect(200);

    await upload(bob, { name: 'b.jpg', type: 'image/jpeg' }).expect(200);

    expect(await readdir(dir)).toHaveLength(2);
    expect((await profile(alice)).body.hasAvatar).toBe(true);
  });
});
