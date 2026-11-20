import { Chip } from '@heroui/react';
import type { TranscriptionSummary } from '@/lib/api';
import {
  getTranscriptionColor,
  getTranscriptionLabel,
} from '@/lib/transcription-status';

/** Chip with the transcription status of a file. */
export function TranscriptionStatusBadge({
  transcription,
}: {
  transcription: TranscriptionSummary;
}) {
  return (
    <Chip
      size="sm"
      variant="soft"
      color={getTranscriptionColor(transcription.status)}
    >
      {getTranscriptionLabel(transcription.status)}
    </Chip>
  );
}
