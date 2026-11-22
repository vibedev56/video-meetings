import {
  AiProcessingStatus,
  TranscriptionStatus,
  type MeetingFileResponse,
} from '@/lib/api';
import { isAiSkipped } from '@/lib/ai-status';

export enum PipelineStepId {
  UPLOAD = 'UPLOAD',
  TRANSCRIPTION = 'TRANSCRIPTION',
  AI = 'AI',
}

export enum PipelineStepState {
  DONE = 'DONE',
  CURRENT = 'CURRENT',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
}

export interface PipelineStep {
  id: PipelineStepId;
  title: string;
  subtitle: string;
  state: PipelineStepState;
}

interface StepStatus {
  isDone: boolean;
  isError: boolean;
  subtitle: string;
}

function uploadStatus(files: MeetingFileResponse[] | null): StepStatus {
  const hasFiles = files !== null && files.length > 0;
  return {
    isDone: hasFiles,
    isError: false,
    subtitle: hasFiles ? 'Файл загружен' : 'Ожидает файл',
  };
}

function transcriptionStatus(files: MeetingFileResponse[] | null): StepStatus {
  const statuses = (files ?? []).flatMap((file) =>
    file.transcription ? [file.transcription.status] : [],
  );
  if (statuses.length === 0) {
    return {
      isDone: false,
      isError: false,
      subtitle: 'Whisper, после загрузки',
    };
  }
  const isActive = statuses.some(
    (status) =>
      status === TranscriptionStatus.PENDING ||
      status === TranscriptionStatus.PROCESSING,
  );
  if (isActive) {
    return { isDone: false, isError: false, subtitle: 'Идёт расшифровка' };
  }
  const isCompleted = statuses.includes(TranscriptionStatus.COMPLETED);
  return isCompleted
    ? { isDone: true, isError: false, subtitle: 'Готово' }
    : { isDone: false, isError: true, subtitle: 'Не удалось' };
}

function aiStatus(
  status: AiProcessingStatus,
  aiError: string | null,
): StepStatus {
  if (isAiSkipped(status, aiError)) {
    return { isDone: false, isError: false, subtitle: 'Не настроен' };
  }
  switch (status) {
    case AiProcessingStatus.DONE:
      return { isDone: true, isError: false, subtitle: 'Готово' };
    case AiProcessingStatus.FAILED:
      return { isDone: false, isError: true, subtitle: 'Не удалось' };
    case AiProcessingStatus.IN_PROGRESS:
      return { isDone: false, isError: false, subtitle: 'Идёт анализ' };
    default:
      return { isDone: false, isError: false, subtitle: 'В очереди' };
  }
}

/**
 * The three stages of a meeting: file upload, transcription, AI analysis.
 * Finished steps are DONE, the first unfinished one is CURRENT (a failed one
 * is ERROR), and the rest are PENDING. `files` is null while they load.
 */
export function buildMeetingPipeline(
  files: MeetingFileResponse[] | null,
  ai: { status: AiProcessingStatus; error: string | null },
): PipelineStep[] {
  const stages: Array<[PipelineStepId, string, StepStatus]> = [
    [PipelineStepId.UPLOAD, 'Загрузка файла', uploadStatus(files)],
    [PipelineStepId.TRANSCRIPTION, 'Расшифровка', transcriptionStatus(files)],
    [PipelineStepId.AI, 'ИИ-анализ', aiStatus(ai.status, ai.error)],
  ];

  let hasCurrent = false;
  return stages.map(([id, title, status]) => {
    let state = PipelineStepState.PENDING;
    if (status.isDone) {
      state = PipelineStepState.DONE;
    } else if (status.isError) {
      state = PipelineStepState.ERROR;
    } else if (!hasCurrent) {
      state = PipelineStepState.CURRENT;
    }
    if (state !== PipelineStepState.DONE) {
      hasCurrent = true;
    }
    return { id, title, subtitle: status.subtitle, state };
  });
}
