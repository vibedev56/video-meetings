import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

const PASSWORD = 'correct-horse-battery-staple';
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

describe('Avatar download and delete (e2e)', () => {
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

  const upload = (token: string, content: Buffer) =>
    request(server())
      .put('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', content, { filename: 'me.png', contentType: 'image/png' })
      .expect(200);

  const download = (token: string) =>
    request(server())
      .get('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

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

  it('returns the uploaded bytes with the image MIME type', async () => {
    const token = await registerUser();
    const content = Buffer.from('png bytes');
    await upload(token, content);

    const res = await download(token).expect(200);

    expect(res.headers['content-type']).toBe('image/png');
    expect(res.body).toEqual(content);
  });

  it('sends an ETag and answers 304 to a matching If-None-Match', async () => {
    const token = await registerUser();
    await upload(token, Buffer.from('png bytes'));

    const first = await download(token).expect(200);
    const etag = first.headers['etag'] as string;
    expect(etag).toBeTruthy();

    const cached = await request(server())
      .get('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', etag)
      .expect(304);
    expect(cached.headers['etag']).toBe(etag);
    expect(cached.headers['cache-control']).toBe('private, no-cache');
  });

  it('changes the ETag when the avatar is replaced', async () => {
    const token = await registerUser();
    await upload(token, Buffer.from('one'));
    const etag = (await download(token).expect(200)).headers['etag'] as string;

    await upload(token, Buffer.from('two'));

    const res = await request(server())
      .get('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', etag)
      .expect(200);
    expect(res.headers['etag']).not.toBe(etag);
  });

  it('returns 404 when the user has no avatar', async () => {
    const token = await registerUser();

    await download(token).expect(404);
  });

  it('requires a token to download and to delete', async () => {
    await request(server()).get('/profile/avatar').expect(401);
    await request(server()).delete('/profile/avatar').expect(401);
  });

  it('serves each user only their own avatar', async () => {
    const first = await registerUser();
    const second = await registerUser();
    await upload(first, Buffer.from('first'));

    await download(second).expect(404);
    expect((await download(first).expect(200)).body).toEqual(
      Buffer.from('first'),
    );
  });

  it('deletes the avatar, its file and the profile flag', async () => {
    const token = await registerUser();
    await upload(token, Buffer.from('x'));
    expect(await readdir(dir)).toHaveLength(1);

    await request(server())
      .delete('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(await readdir(dir)).toEqual([]);
    await download(token).expect(404);
    const profile = await request(server())
      .get('/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profile.body.hasAvatar).toBe(false);
  });

  it('does not touch another user avatar on delete', async () => {
    const first = await registerUser();
    const second = await registerUser();
    await upload(first, Buffer.from('first'));

    await request(server())
      .delete('/profile/avatar')
      .set('Authorization', `Bearer ${second}`)
      .expect(204);

    expect(await readdir(dir)).toHaveLength(1);
    await download(first).expect(200);
  });
});
