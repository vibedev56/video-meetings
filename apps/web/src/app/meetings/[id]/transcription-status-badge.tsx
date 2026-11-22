import { Badge, type BadgeTone } from '@/components/ui';
import type { TranscriptionSummary } from '@/lib/api';
import {
  getTranscriptionColor,
  getTranscriptionLabel,
  type StatusColor,
} from '@/lib/transcription-status';

const TONES: Record<StatusColor, BadgeTone> = {
  default: 'neutral',
  accent: 'accent',
  success: 'success',
  danger: 'danger',
};

/** Badge with the transcription status of a file. */
export function TranscriptionStatusBadge({
  transcription,
}: {
  transcription: TranscriptionSummary;
}) {
  return (
    <Badge tone={TONES[getTranscriptionColor(transcription.status)]} size="sm">
      {getTranscriptionLabel(transcription.status)}
    </Badge>
  );
}
