import { Alert, Card, Chip, Spinner } from '@heroui/react';
import { AiProcessingStatus, type MeetingDetailResponse } from '@/lib/api';
import {
  getAiStatusColor,
  getAiStatusLabel,
  isAiSkipped,
} from '@/lib/ai-status';

const SECTION_TITLE = 'text-xl font-semibold text-zinc-950 dark:text-zinc-50';
const EMPTY_TEXT = 'text-zinc-600 dark:text-zinc-400';
const BODY_TEXT = 'text-zinc-800 dark:text-zinc-200';

function emptyText(isDone: boolean, fallback: string): string {
  return isDone ? 'ИИ ничего не нашёл.' : fallback;
}

/** AI status, summary, action items and decisions of a meeting. */
export function MeetingAiInsights({
  meeting,
}: {
  meeting: MeetingDetailResponse;
}) {
  const isRunning = meeting.aiStatus === AiProcessingStatus.IN_PROGRESS;
  const isDone = meeting.aiStatus === AiProcessingStatus.DONE;
  const isSkipped = isAiSkipped(meeting.aiStatus, meeting.aiError);

  return (
    <section aria-labelledby="meeting-ai-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="meeting-ai-title" className={SECTION_TITLE}>
          ИИ-анализ
        </h2>
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2"
        >
          {isRunning && <Spinner size="sm" aria-label="Идёт анализ" />}
          <Chip
            size="sm"
            variant="soft"
            color={getAiStatusColor(meeting.aiStatus, meeting.aiError)}
          >
            {getAiStatusLabel(meeting.aiStatus, meeting.aiError)}
          </Chip>
        </div>
      </div>

      {meeting.aiStatus === AiProcessingStatus.FAILED && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Не удалось выполнить ИИ-анализ</Alert.Title>
            {meeting.aiError && (
              <Alert.Description>{meeting.aiError}</Alert.Description>
            )}
          </Alert.Content>
        </Alert>
      )}

      {isSkipped && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>ИИ-анализ отключён</Alert.Title>
            <Alert.Description>
              Добавьте ANTHROPIC_API_KEY в apps/api/.env, чтобы получать
              выжимку, задачи и решения автоматически.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Card>
        <Card.Header>
          <Card.Title>Summary</Card.Title>
        </Card.Header>
        <Card.Content>
          {meeting.summary ? (
            <p className={`whitespace-pre-line break-words ${BODY_TEXT}`}>
              {meeting.summary}
            </p>
          ) : (
            <p className={EMPTY_TEXT}>
              {emptyText(isDone, 'Выжимки пока нет.')}
            </p>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Action Items</Card.Title>
        </Card.Header>
        <Card.Content>
          {meeting.tasks.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {meeting.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span className={`break-words ${BODY_TEXT}`}>
                    {task.title}
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {task.assignee
                      ? `Ответственный: ${task.assignee}`
                      : 'Ответственный не назначен'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={EMPTY_TEXT}>{emptyText(isDone, 'Задач пока нет.')}</p>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Decisions</Card.Title>
        </Card.Header>
        <Card.Content>
          {meeting.decisions.length > 0 ? (
            <ul className={`flex list-disc flex-col gap-2 pl-5 ${BODY_TEXT}`}>
              {meeting.decisions.map((decision, index) => (
                <li key={`${index}-${decision}`} className="break-words">
                  {decision}
                </li>
              ))}
            </ul>
          ) : (
            <p className={EMPTY_TEXT}>
              {emptyText(isDone, 'Решений пока нет.')}
            </p>
          )}
        </Card.Content>
      </Card>
    </section>
  );
}
