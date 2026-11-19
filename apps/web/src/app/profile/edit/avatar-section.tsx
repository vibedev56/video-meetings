'use client';

import { Alert, Button, Card, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ApiError, deleteAvatar, uploadAvatar } from '@/lib/api';
import {
  ACCEPTED_AVATAR_EXTENSIONS,
  AVATAR_FILE_TOO_LARGE_MESSAGE,
  AVATAR_UNSUPPORTED_FORMAT_MESSAGE,
  validateAvatarFile,
} from '@/lib/avatar-validation';
import {
  redirectToLoginIfUnauthorized,
  requireAccessToken,
} from '@/lib/session';
import { forgetAvatar, refreshAvatar } from '@/lib/use-avatar';
import { patchCachedProfile } from '@/lib/use-profile';

/** Russian message for a failed upload, by the API status. */
function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        return 'Сервер недоступен. Проверьте подключение.';
      case 400:
      case 415:
        // The API answers 400 for a wrong type (415 is kept for safety).
        return AVATAR_UNSUPPORTED_FORMAT_MESSAGE;
      case 413:
        return AVATAR_FILE_TOO_LARGE_MESSAGE;
    }
  }
  return 'Не удалось загрузить аватар. Попробуйте позже.';
}

/** Russian message for a failed delete, by the API status. */
function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) {
    return 'Сервер недоступен. Проверьте подключение.';
  }
  return 'Не удалось удалить аватар. Попробуйте позже.';
}

/**
 * «Аватар» section: pick a file, check it in the browser and upload it right
 * away. The shared profile cache is updated so other pages see the change.
 */
export function AvatarSection({ hasAvatar }: { hasAvatar: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputButtonRef = useRef<HTMLButtonElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const focusFileButton = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (focusFileButton.current && !isDeleting) {
      focusFileButton.current = false;
      inputButtonRef.current?.focus();
    }
  }, [isDeleting]);

  async function handleDelete() {
    if (isUploading || isDeleting) {
      return;
    }
    const token = requireAccessToken(router);
    if (!token) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsDeleting(true);
    try {
      await deleteAvatar(token);
      forgetAvatar();
      patchCachedProfile({ hasAvatar: false });
      // The delete button unmounts; focus moves once the section is enabled.
      focusFileButton.current = true;
      setMessage('Аватар удалён');
    } catch (caught) {
      if (redirectToLoginIfUnauthorized(caught, router)) {
        return;
      }
      setError(deleteErrorMessage(caught));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Reset so choosing the same file again fires `change` again.
    input.value = '';
    if (!file || isDeleting) {
      return;
    }

    setMessage(null);
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = requireAccessToken(router);
    if (!token) {
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      await uploadAvatar(token, file);
      refreshAvatar();
      patchCachedProfile({ hasAvatar: true });
      setMessage('Аватар обновлён');
    } catch (caught) {
      if (redirectToLoginIfUnauthorized(caught, router)) {
        return;
      }
      setError(uploadErrorMessage(caught));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-2xl">Аватар</Card.Title>
        <Card.Description>
          JPG, PNG или WebP, до 2 МБ. Новый файл заменит текущий аватар.
        </Card.Description>
      </Card.Header>

      <Card.Content className="flex flex-col gap-5">
        {message && (
          <Alert status="success" role="status" aria-live="polite">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{message}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}
        {error && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_AVATAR_EXTENSIONS.join(',')}
          aria-label="Файл аватара"
          className="sr-only"
          tabIndex={-1}
          onChange={handleChange}
          disabled={isUploading || isDeleting}
        />
      </Card.Content>

      <Card.Footer className="flex flex-wrap gap-3">
        <Button
          ref={inputButtonRef}
          size="lg"
          isPending={isUploading}
          isDisabled={isDeleting}
          onPress={() => inputRef.current?.click()}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color="current" size="sm" /> : null}
              Выбрать файл
            </>
          )}
        </Button>
        {hasAvatar && (
          <Button
            size="lg"
            variant="danger-soft"
            isPending={isDeleting}
            isDisabled={isUploading}
            onPress={handleDelete}
          >
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                Удалить аватар
              </>
            )}
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
