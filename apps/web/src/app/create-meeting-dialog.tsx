'use client';

import {
  Alert,
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';
import { ApiError, createMeeting } from '@/lib/api';
import { getAccessToken, redirectToLoginIfUnauthorized } from '@/lib/session';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits a comma, semicolon or whitespace separated list into trimmed emails. */
function parseParticipants(value: string) {
  return value
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateParticipants(value: string) {
  return parseParticipants(value).every((email) => EMAIL_PATTERN.test(email))
    ? null
    : 'Введите корректные email через запятую';
}

export function CreateMeetingDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [participants, setParticipants] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    // Do not allow closing while the request is running.
    if (!nextOpen && isSubmitting) {
      return;
    }
    setIsOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
    }
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const meeting = await createMeeting(token, {
        title: title.trim(),
        // `datetime-local` has no time zone: interpret it as local time.
        date: new Date(date).toISOString(),
        participants: parseParticipants(participants),
      });
      router.push(`/meetings/${meeting.id}`);
    } catch (e) {
      setIsSubmitting(false);
      if (redirectToLoginIfUnauthorized(e, router)) {
        return;
      }
      setError(
        e instanceof ApiError && e.status === 400
          ? 'Проверьте данные: название, дата и email участников должны быть корректными.'
          : e instanceof ApiError && e.status === 0
            ? e.message
            : 'Не удалось создать встречу. Попробуйте позже.',
      );
    }
  }

  return (
    <>
      <Button
        size="lg"
        className="min-h-12 w-full sm:flex-1"
        onPress={() => setIsOpen(true)}
      >
        Создать встречу
      </Button>

      <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger className="min-h-11 min-w-11" />
              <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Modal.Header>
                  <Modal.Heading>Новая встреча</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <TextField
                    isRequired
                    name="title"
                    value={title}
                    onChange={setTitle}
                    validate={(v) =>
                      v.trim() ? null : 'Введите название встречи'
                    }
                  >
                    <Label>Название</Label>
                    <Input placeholder="Планерка" />
                    <FieldError />
                  </TextField>
                  <TextField
                    isRequired
                    name="date"
                    type="datetime-local"
                    value={date}
                    onChange={setDate}
                  >
                    <Label>Дата и время</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                  <TextField
                    name="participants"
                    value={participants}
                    onChange={setParticipants}
                    validate={validateParticipants}
                  >
                    <Label>Участники (email через запятую)</Label>
                    <Input placeholder="anna@example.com, …" />
                    <FieldError />
                  </TextField>
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
                    isDisabled={isSubmitting}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-11"
                    isDisabled={isSubmitting}
                  >
                    {isSubmitting ? 'Создание…' : 'Создать'}
                  </Button>
                </Modal.Footer>
              </Form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
