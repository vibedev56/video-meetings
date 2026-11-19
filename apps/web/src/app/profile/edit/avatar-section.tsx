'use client';

import { Alert, Button, Card, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError, uploadAvatar } from '@/lib/api';
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
import { patchCachedProfile } from '@/lib/use-profile';

/** Russian message for a failed upload, by the API status. */
function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        return 'Сервер недоступен. Проверьте подключение.';
      case 400:
        return 'Сервер не принял файл. Проверьте формат и размер.';
      case 413:
        return AVATAR_FILE_TOO_LARGE_MESSAGE;
      case 415:
        return AVATAR_UNSUPPORTED_FORMAT_MESSAGE;
    }
  }
  return 'Не удалось загрузить аватар. Попробуйте позже.';
}

/**
 * «Аватар» section: pick a file, check it in the browser and upload it right
 * away. The shared profile cache is updated so other pages see the change.
 */
export function AvatarSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Reset so choosing the same file again fires `change` again.
    input.value = '';
    if (!file) {
      return;
    }

    setIsSaved(false);
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
      patchCachedProfile({ hasAvatar: true });
      setIsSaved(true);
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
        {isSaved && (
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Аватар обновлён</Alert.Title>
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
          disabled={isUploading}
        />
      </Card.Content>

      <Card.Footer>
        <Button
          size="lg"
          isPending={isUploading}
          onPress={() => inputRef.current?.click()}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color="current" size="sm" /> : null}
              Выбрать файл
            </>
          )}
        </Button>
      </Card.Footer>
    </Card>
  );
}
