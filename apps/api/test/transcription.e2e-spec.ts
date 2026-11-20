import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TRANSCRIPTION_RUNNER } from '../src/transcriptions/transcription.runner.js';
import {
  FAKE_FAILURE_MESSAGE,
  FAKE_TRANSCRIPT,
  FakeTranscriptionRunner,
} from './support/fake-transcription-runner.js';

const PASSWORD = 'correct-horse-battery-staple';
const POLL_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 25;
const SETTLE_MS = 200;
const GENERIC_FAILURE = 'Transcription failed';

const MP3 = { name: 'standup.mp3', type: 'audio/mpeg' };
const MP4 = { name: 'demo.mp4', type: 'video/mp4' };
const MOV = { name: 'demo.mov', type: 'video/quicktime' };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Transcriptions (e2e)', () => {
  let app: INestApplication<App>;
  let runner: FakeTranscriptionRunner;
  let storageDir: string;
  const previousDir = process.env.MEETING_FILES_DIR;

  const server = () => app.getHttpServer();
  const prisma = () => app.get(PrismaService);

  const bootApp = async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TRANSCRIPTION_RUNNER)
      .useValue(runner)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  };

  const registerUser = async (): Promise<string> => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email: `user-${randomUUID()}@example.com`, password: PASSWORD })
      .expect(201);
    return res.body.accessToken as string;
  };

  const createMeeting = async (token: string): Promise<string> => {
    const res = await request(server())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Sprint planning',
        date: new Date(Date.now() + 86_400_000).toISOString(),
        participants: [],
      })
      .expect(201);
    return res.body.id as string;
  };

  const upload = (
    token: string,
    meetingId: string,
    file: { name: string; type: string },
  ) =>
    request(server())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake media bytes'), {
        filename: file.name,
        contentType: file.type,
      });

  const listFiles = (token: string, meetingId: string) =>
    request(server())
      .get(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`);

  const getTranscription = (token: string, meetingId: string, fileId: string) =>
    request(server())
      .get(`/meetings/${meetingId}/files/${fileId}/transcription`)
      .set('Authorization', `Bearer ${token}`);

  const deleteFile = (token: string, meetingId: string, fileId: string) =>
    request(server())
      .delete(`/meetings/${meetingId}/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);

  const countRows = (meetingFileId: string) =>
    prisma().transcription.count({ where: { meetingFileId } });

  /** Polls the transcript endpoint until the status matches. */
  const waitForStatus = async (
    token: string,
    meetingId: string,
    fileId: string,
    status: string,
  ) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let lastStatus: string | undefined;
    while (Date.now() < deadline) {
      const res = await getTranscription(token, meetingId, fileId);
      if (res.status === 200) {
        lastStatus = res.body.status as string;
        if (lastStatus === status) return res.body;
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(`Status ${status} not reached, last: ${lastStatus}`);
  };

  const setup = async () => {
    const token = await registerUser();
    const meetingId = await createMeeting(token);
    return { token, meetingId };
  };

  beforeEach(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'transcription-'));
    process.env.MEETING_FILES_DIR = storageDir;
    runner = new FakeTranscriptionRunner();
    await bootApp();
  });

  /** Waits for the queue to finish, so no stuck rows are recovered by the next app. */
  const drainQueue = async () => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const active = await prisma().transcription.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      });
      if (active === 0) return;
      await sleep(POLL_INTERVAL_MS);
    }
  };

  afterEach(async () => {
    runner.releaseDelayed();
    await drainQueue();
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

  describe('successful transcription', () => {
    it.each([MP3, MP4])(
      'uploads $name as PENDING and ends COMPLETED with text',
      async (file) => {
        const { token, meetingId } = await setup();
        runner.holdRuns();

        const res = await upload(token, meetingId, file).expect(201);

        expect(res.body.transcription).toEqual({
          status: 'PENDING',
          error: null,
        });
        expect(res.body).not.toHaveProperty('storedName');

        runner.releaseDelayed();
        const done = await waitForStatus(
          token,
          meetingId,
          res.body.id,
          'COMPLETED',
        );
        expect(done).toEqual({
          status: 'COMPLETED',
          text: FAKE_TRANSCRIPT,
          error: null,
        });

        const list = await listFiles(token, meetingId).expect(200);
        expect(list.body[0].transcription).toEqual({
          status: 'COMPLETED',
          error: null,
        });
      },
    );

    it('shows PROCESSING while the runner works', async () => {
      const { token, meetingId } = await setup();
      runner.holdRuns();

      const res = await upload(token, meetingId, MP3).expect(201);

      const processing = await waitForStatus(
        token,
        meetingId,
        res.body.id,
        'PROCESSING',
      );
      expect(processing.text).toBeNull();
      const list = await listFiles(token, meetingId).expect(200);
      expect(list.body[0].transcription.status).toBe('PROCESSING');
      expect(runner.calls).toHaveLength(1);
      expect(runner.calls[0]).toContain(storageDir);

      runner.releaseDelayed();
      await waitForStatus(token, meetingId, res.body.id, 'COMPLETED');
    });

    it('processes files one at a time', async () => {
      const { token, meetingId } = await setup();
      runner.holdRuns();

      const first = await upload(token, meetingId, MP3).expect(201);
      const second = await upload(token, meetingId, MP4).expect(201);
      await waitForStatus(token, meetingId, first.body.id, 'PROCESSING');
      await waitForStatus(token, meetingId, second.body.id, 'PENDING');

      const secondWhileBusy = await getTranscription(
        token,
        meetingId,
        second.body.id,
      ).expect(200);
      expect(secondWhileBusy.body.status).toBe('PENDING');
      expect(runner.calls).toHaveLength(1);

      runner.releaseDelayed();
      await waitForStatus(token, meetingId, second.body.id, 'COMPLETED');
      expect(runner.calls).toHaveLength(2);
    });
  });

  describe('failed transcription', () => {
    it('stores the safe message from a TranscriptionFailedError', async () => {
      const { token, meetingId } = await setup();
      runner.behavior = 'failure';

      const res = await upload(token, meetingId, MP3).expect(201);

      const failed = await waitForStatus(
        token,
        meetingId,
        res.body.id,
        'FAILED',
      );
      expect(failed).toEqual({
        status: 'FAILED',
        text: null,
        error: FAKE_FAILURE_MESSAGE,
      });
      const list = await listFiles(token, meetingId).expect(200);
      expect(list.body[0].transcription).toEqual({
        status: 'FAILED',
        error: FAKE_FAILURE_MESSAGE,
      });
    });

    it('hides the details of an unexpected error', async () => {
      const { token, meetingId } = await setup();
      runner.behavior = 'unexpected';

      const res = await upload(token, meetingId, MP4).expect(201);

      const failed = await waitForStatus(
        token,
        meetingId,
        res.body.id,
        'FAILED',
      );
      expect(failed.error).toBe(GENERIC_FAILURE);
      expect(JSON.stringify(failed)).not.toContain('boom');
    });

    it('keeps the queue alive after a failure', async () => {
      const { token, meetingId } = await setup();
      runner.behavior = 'failure';
      const bad = await upload(token, meetingId, MP3).expect(201);
      await waitForStatus(token, meetingId, bad.body.id, 'FAILED');

      runner.behavior = 'success';
      const good = await upload(token, meetingId, MP4).expect(201);

      await waitForStatus(token, meetingId, good.body.id, 'COMPLETED');
    });
  });

  describe('ineligible files', () => {
    it('gives transcription null for .mov and never runs whisper', async () => {
      const { token, meetingId } = await setup();

      const res = await upload(token, meetingId, MOV).expect(201);

      expect(res.body.transcription).toBeNull();
      await sleep(SETTLE_MS);
      const list = await listFiles(token, meetingId).expect(200);
      expect(list.body[0].transcription).toBeNull();
      expect(runner.calls).toEqual([]);
      await getTranscription(token, meetingId, res.body.id).expect(404);
    });
  });

  describe('GET /meetings/:id/files/:fileId/transcription', () => {
    it('returns 404 for another user', async () => {
      const { token, meetingId } = await setup();
      const otherToken = await registerUser();
      const file = await upload(token, meetingId, MP3).expect(201);
      await waitForStatus(token, meetingId, file.body.id, 'COMPLETED');

      await getTranscription(otherToken, meetingId, file.body.id).expect(404);
    });

    it('returns 404 for a file of another meeting of the same user', async () => {
      const { token, meetingId } = await setup();
      const otherMeeting = await createMeeting(token);
      const file = await upload(token, meetingId, MP3).expect(201);

      await getTranscription(token, otherMeeting, file.body.id).expect(404);
    });

    it('returns 404 for an unknown file id', async () => {
      const { token, meetingId } = await setup();

      await getTranscription(token, meetingId, randomUUID()).expect(404);
    });

    it('returns 401 without a token and with an invalid one', async () => {
      const { token, meetingId } = await setup();
      const file = await upload(token, meetingId, MP3).expect(201);
      const url = `/meetings/${meetingId}/files/${file.body.id}/transcription`;

      await request(server()).get(url).expect(401);
      await request(server())
        .get(url)
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });

  describe('deletion', () => {
    it('removes the transcription row with the file', async () => {
      const { token, meetingId } = await setup();
      const file = await upload(token, meetingId, MP3).expect(201);
      await waitForStatus(token, meetingId, file.body.id, 'COMPLETED');

      await deleteFile(token, meetingId, file.body.id).expect(204);

      expect(await countRows(file.body.id)).toBe(0);
      await getTranscription(token, meetingId, file.body.id).expect(404);
    });

    it('removes transcription rows with the meeting', async () => {
      const { token, meetingId } = await setup();
      const file = await upload(token, meetingId, MP3).expect(201);
      await waitForStatus(token, meetingId, file.body.id, 'COMPLETED');

      await request(server())
        .delete(`/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(await countRows(file.body.id)).toBe(0);
    });

    it('survives a file deleted while its transcription is running', async () => {
      const { token, meetingId } = await setup();
      runner.holdRuns();
      const file = await upload(token, meetingId, MP3).expect(201);
      await waitForStatus(token, meetingId, file.body.id, 'PROCESSING');

      await deleteFile(token, meetingId, file.body.id).expect(204);
      runner.releaseDelayed();

      const next = await upload(token, meetingId, MP4).expect(201);
      await waitForStatus(token, meetingId, next.body.id, 'COMPLETED');
      expect(await countRows(file.body.id)).toBe(0);
    });
  });

  describe('startup recovery', () => {
    // A .mov never gets a row from the upload flow, so the stuck state is
    // seeded directly and the first app's queue cannot race with it.
    const restartApp = async () => {
      await app.close();
      runner = new FakeTranscriptionRunner();
      await bootApp();
    };

    it.each(['PROCESSING', 'PENDING'] as const)(
      're-queues a row stuck in %s after a restart',
      async (stuckStatus) => {
        const { token, meetingId } = await setup();
        const file = await upload(token, meetingId, MOV).expect(201);
        const fileId = file.body.id as string;
        await prisma().transcription.create({
          data: {
            meetingFileId: fileId,
            status: stuckStatus,
            startedAt: stuckStatus === 'PROCESSING' ? new Date() : null,
          },
        });

        await restartApp();

        const done = await waitForStatus(token, meetingId, fileId, 'COMPLETED');
        expect(done.text).toBe(FAKE_TRANSCRIPT);
      },
    );

    it('leaves FAILED rows alone', async () => {
      const { token, meetingId } = await setup();
      const file = await upload(token, meetingId, MOV).expect(201);
      const fileId = file.body.id as string;
      await prisma().transcription.create({
        data: {
          meetingFileId: fileId,
          status: 'FAILED',
          error: GENERIC_FAILURE,
        },
      });

      await restartApp();
      await sleep(SETTLE_MS);

      const res = await getTranscription(token, meetingId, fileId).expect(200);
      expect(res.body.status).toBe('FAILED');
      expect(runner.calls).toEqual([]);
    });
  });
});
