import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import sharp from 'sharp';
import { JPEG_BYTES, PNG_BYTES } from './support/avatar-fixtures.js';

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

  const upload = (token: string, content: Buffer, filename = 'me.png') =>
    request(server())
      .put('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', content, {
        filename,
        contentType: filename.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
      })
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
    const content = PNG_BYTES;
    await upload(token, content);

    const res = await download(token).expect(200);

    expect(res.headers['content-type']).toBe('image/png');
    expect(res.body).toEqual(content);
    expect(res.headers['content-length']).toBe(String(content.length));
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none'; sandbox",
    );
    expect(res.headers['content-disposition']).toBe(
      'inline; filename="avatar"',
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('puts the ETag value in the profile as avatarVersion', async () => {
    const token = await registerUser();
    await upload(token, JPEG_BYTES, 'me.jpg');

    const etag = (await download(token).expect(200)).headers['etag'] as string;
    const profile = await request(server())
      .get('/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(etag).toBe(`"${profile.body.avatarVersion}"`);
  });

  it('sends an ETag and answers 304 to a matching If-None-Match', async () => {
    const token = await registerUser();
    await upload(token, PNG_BYTES);

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
    await upload(token, PNG_BYTES);
    const etag = (await download(token).expect(200)).headers['etag'] as string;

    await upload(token, PNG_BYTES);

    const res = await request(server())
      .get('/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', etag)
      .expect(200);
    expect(res.headers['etag']).not.toBe(etag);
  });

  describe('thumbnail', () => {
    const bigPng = () =>
      sharp({
        create: {
          width: 600,
          height: 300,
          channels: 3,
          background: { r: 200, g: 40, b: 40 },
        },
      })
        .png()
        .toBuffer();

    const thumb = (token: string, etag?: string) => {
      const req = request(server())
        .get('/profile/avatar?size=thumb')
        .set('Authorization', `Bearer ${token}`)
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      return etag ? req.set('If-None-Match', etag) : req;
    };

    it('serves a 128 px square webp with its own ETag', async () => {
      const token = await registerUser();
      await upload(token, await bigPng());

      const res = await thumb(token).expect(200);
      const meta = await sharp(res.body as Buffer).metadata();

      expect(res.headers['content-type']).toBe('image/webp');
      expect([meta.format, meta.width, meta.height]).toEqual([
        'webp',
        128,
        128,
      ]);
      const full = await download(token).expect(200);
      expect(res.headers['etag']).not.toBe(full.headers['etag']);
      await thumb(token, res.headers['etag'] as string).expect(304);
    });

    it('removes the thumbnail together with the avatar', async () => {
      const token = await registerUser();
      await upload(token, await bigPng());
      await thumb(token).expect(200);
      expect(await readdir(dir)).toHaveLength(2);

      await request(server())
        .delete('/profile/avatar')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(await readdir(dir)).toEqual([]);
    });

    it('removes the old thumbnail when the avatar is replaced', async () => {
      const token = await registerUser();
      await upload(token, await bigPng());
      await thumb(token).expect(200);

      await upload(token, await bigPng());

      expect(await readdir(dir)).toHaveLength(1);
    });

    it('falls back to the original when it cannot be resized', async () => {
      const token = await registerUser();
      await upload(token, PNG_BYTES);

      const res = await thumb(token).expect(200);

      expect(res.headers['content-type']).toBe('image/png');
    });

    it('rejects an unknown size', async () => {
      const token = await registerUser();
      await upload(token, PNG_BYTES);

      await request(server())
        .get('/profile/avatar?size=huge')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
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
    await upload(first, PNG_BYTES);

    await download(second).expect(404);
    expect((await download(first).expect(200)).body).toEqual(PNG_BYTES);
  });

  it('deletes the avatar, its file and the profile flag', async () => {
    const token = await registerUser();
    await upload(token, PNG_BYTES);
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
    expect(profile.body.avatarVersion).toBeNull();
  });

  it('does not touch another user avatar on delete', async () => {
    const first = await registerUser();
    const second = await registerUser();
    await upload(first, PNG_BYTES);

    await request(server())
      .delete('/profile/avatar')
      .set('Authorization', `Bearer ${second}`)
      .expect(204);

    expect(await readdir(dir)).toHaveLength(1);
    await download(first).expect(200);
  });
});
