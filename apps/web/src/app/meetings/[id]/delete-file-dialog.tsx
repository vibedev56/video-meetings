import { Alert, Button, Modal } from '@heroui/react';
import type { MeetingFileResponse } from '@/lib/api';

interface DeleteFileDialogProps {
  isOpen: boolean;
  /** Kept after closing, so the text does not go empty during the exit animation. */
  file: MeetingFileResponse | null;
  isDeleting: boolean;
  error: string | null;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
}

/** Confirmation dialog for deleting a meeting file. */
export function DeleteFileDialog({
  isOpen,
  file,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteFileDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Удалить файл?</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-zinc-600 dark:text-zinc-400">
                Файл «{file?.originalName}» будет удален без возможности
                восстановления.
              </p>
              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="outline"
                className="min-h-11"
                isDisabled={isDeleting}
              >
                Отмена
              </Button>
              <Button
                variant="danger"
                className="min-h-11"
                isDisabled={isDeleting}
                onPress={onConfirm}
              >
                {isDeleting ? 'Удаление…' : 'Удалить'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
