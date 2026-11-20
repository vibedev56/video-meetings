'use client';

import { Alert, Button, Modal, Spinner } from '@heroui/react';
import { useEffect, useState } from 'react';
import { getTranscription } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

type TextState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; text: string };

interface TranscriptDialogProps {
  meetingId: string;
  file: { id: string; originalName: string } | null;
  onClose: () => void;
}

/** Modal with the transcript text of a file. Opens while `file` is set. */
export function TranscriptDialog({
  meetingId,
  file,
  onClose,
}: TranscriptDialogProps) {
  return (
    <Modal isOpen={file !== null} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Транскрипция</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="break-all text-sm text-zinc-600 dark:text-zinc-400">
                {file?.originalName}
              </p>
              {file && (
                <TranscriptText
                  key={file.id}
                  meetingId={meetingId}
                  fileId={file.id}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="outline" className="min-h-11">
                Закрыть
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/** Loads and shows the text. Remounted per file (by key), so it starts in `loading`. */
function TranscriptText({
  meetingId,
  fileId,
}: {
  meetingId: string;
  fileId: string;
}) {
  const [state, setState] = useState<TextState>({ status: 'loading' });

  useEffect(() => {
    const token = getAccessToken();
    if (!fileId || !token) {
      return;
    }
    let isCancelled = false;
    getTranscription(token, meetingId, fileId)
      .then((result) => {
        if (!isCancelled) {
          setState({ status: 'ready', text: result.text ?? '' });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setState({ status: 'error' });
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [meetingId, fileId]);

  return (
    <>
      {state.status === 'loading' && (
        <div role="status" className="flex justify-center py-6">
          <Spinner size="md" aria-label="Загрузка транскрипции" />
        </div>
      )}
      {state.status === 'error' && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              Не удалось загрузить транскрипцию. Попробуйте снова.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {state.status === 'ready' && (
        <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-zinc-950 dark:text-zinc-50">
          {state.text || 'Текст пуст.'}
        </p>
      )}
    </>
  );
}
