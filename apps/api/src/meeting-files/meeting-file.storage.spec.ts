import { ConfigService } from '@nestjs/config';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MeetingFileStorage } from './meeting-file.storage.js';

describe('MeetingFileStorage', () => {
  let dir: string;
  let storage: MeetingFileStorage;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'storage-unit-'));
    const config = { get: vi.fn(() => dir) } as unknown as ConfigService;
    storage = new MeetingFileStorage(config);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('removes only the listed files', async () => {
    await writeFile(join(dir, 'a.mp3'), 'a');
    await writeFile(join(dir, 'b.mp4'), 'b');
    await writeFile(join(dir, 'keep.wav'), 'k');

    await storage.remove(['a.mp3', 'b.mp4']);

    expect(await readdir(dir)).toEqual(['keep.wav']);
  });

  it('ignores files that are already missing on disk', async () => {
    await writeFile(join(dir, 'present.mp3'), 'p');

    await expect(
      storage.remove(['present.mp3', 'already-gone.mp3']),
    ).resolves.toBeUndefined();

    expect(await readdir(dir)).toEqual([]);
  });

  it('does nothing for an empty list', async () => {
    await writeFile(join(dir, 'keep.mp3'), 'k');

    await storage.remove([]);

    expect(await readdir(dir)).toEqual(['keep.mp3']);
  });

  it('resolves paths inside the storage directory only', () => {
    expect(storage.pathFor('../outside.mp3')).toBe(join(dir, 'outside.mp3'));
  });
});
