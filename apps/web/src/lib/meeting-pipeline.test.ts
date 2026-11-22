import { describe, expect, it } from 'vitest';
import {
  AiProcessingStatus,
  TranscriptionStatus,
  type MeetingFileResponse,
} from '@/lib/api';
import {
  buildMeetingPipeline,
  PipelineStepState as State,
} from './meeting-pipeline';

function makeFile(status: TranscriptionStatus | null): MeetingFileResponse {
  return {
    id: 'f1',
    originalName: 'запись.mp3',
    sizeBytes: 1,
    uploadedAt: '2026-11-01T10:00:00.000Z',
    transcription: status ? { status, error: null } : null,
  } as MeetingFileResponse;
}

const queued = { status: AiProcessingStatus.PENDING, error: null };

function states(...args: Parameters<typeof buildMeetingPipeline>) {
  return buildMeetingPipeline(...args).map((step) => step.state);
}

describe('buildMeetingPipeline', () => {
  it('waits for a file while there are none', () => {
    expect(states([], queued)).toEqual([
      State.CURRENT,
      State.PENDING,
      State.PENDING,
    ]);
    expect(states(null, queued)[0]).toBe(State.CURRENT);
  });

  it('moves to transcription once a file is uploaded', () => {
    const steps = buildMeetingPipeline(
      [makeFile(TranscriptionStatus.PROCESSING)],
      queued,
    );
    expect(steps.map((step) => step.state)).toEqual([
      State.DONE,
      State.CURRENT,
      State.PENDING,
    ]);
    expect(steps[1].subtitle).toBe('Идёт расшифровка');
  });

  it('marks everything done when transcription and AI are finished', () => {
    expect(
      states([makeFile(TranscriptionStatus.COMPLETED)], {
        status: AiProcessingStatus.DONE,
        error: null,
      }),
    ).toEqual([State.DONE, State.DONE, State.DONE]);
  });

  it('shows a failed stage as an error', () => {
    expect(states([makeFile(TranscriptionStatus.FAILED)], queued)[1]).toBe(
      State.ERROR,
    );
    expect(
      states([makeFile(TranscriptionStatus.COMPLETED)], {
        status: AiProcessingStatus.FAILED,
        error: 'boom',
      })[2],
    ).toBe(State.ERROR);
  });

  it('ignores files that are not transcribed', () => {
    expect(states([makeFile(null)], queued)).toEqual([
      State.DONE,
      State.CURRENT,
      State.PENDING,
    ]);
  });

  it('labels a skipped AI stage as not configured', () => {
    const steps = buildMeetingPipeline([], {
      status: AiProcessingStatus.PENDING,
      error: 'AI processing is not configured',
    });
    expect(steps[2].subtitle).toBe('Не настроен');
  });
});
