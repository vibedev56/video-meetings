'use client';

import {
  CircleDashed,
  Loader,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import {
  Badge,
  InlineAlert,
  Tab,
  TaskItem,
  type BadgeTone,
} from '@/components/ui';
import {
  AiProcessingStatus,
  TaskStatus,
  type MeetingDetailResponse,
} from '@/lib/api';
import { getAiStatusLabel, isAiSkipped } from '@/lib/ai-status';

enum InsightTab {
  SUMMARY = 'SUMMARY',
  TASKS = 'TASKS',
  DECISIONS = 'DECISIONS',
}

const TABS: Array<{ id: InsightTab; label: string }> = [
  { id: InsightTab.SUMMARY, label: 'Summary' },
  { id: InsightTab.TASKS, label: 'Action Items' },
  { id: InsightTab.DECISIONS, label: 'Decisions' },
];

const TAB_CLASSES = 'flex-1 justify-center text-xs md:flex-none md:text-[13px]';

function statusBadge(
  status: AiProcessingStatus,
  aiError: string | null,
): { tone: BadgeTone; icon: LucideIcon } {
  if (isAiSkipped(status, aiError)) {
    return { tone: 'neutral', icon: CircleDashed };
  }
  switch (status) {
    case AiProcessingStatus.DONE:
      return { tone: 'success', icon: Sparkles };
    case AiProcessingStatus.FAILED:
      return { tone: 'danger', icon: TriangleAlert };
    case AiProcessingStatus.IN_PROGRESS:
      return { tone: 'accent', icon: Loader };
    default:
      return { tone: 'warning', icon: Loader };
  }
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-ds-lg bg-ds-bg p-6 text-center md:min-h-[300px]">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-ds-lg border border-ds-line bg-ds-surface text-ds-accent"
      >
        <Sparkles className="size-6" />
      </span>
      <p className="text-[17px] font-bold text-ds-ink">{title}</p>
      <p className="max-w-[400px] text-sm leading-normal text-ds-muted">
        {text}
      </p>
    </div>
  );
}

function Panel({
  id,
  tabId,
  isActive,
  children,
}: {
  id: string;
  tabId: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={tabId} hidden={!isActive}>
      {children}
    </div>
  );
}

/** AI status, summary, action items and decisions of a meeting. */
export function MeetingAiInsights({
  meeting,
}: {
  meeting: MeetingDetailResponse;
}) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState(InsightTab.SUMMARY);
  const isDone = meeting.aiStatus === AiProcessingStatus.DONE;
  const isSkipped = isAiSkipped(meeting.aiStatus, meeting.aiError);
  const badge = statusBadge(meeting.aiStatus, meeting.aiError);
  const nothingFound = 'ИИ ничего не нашёл.';

  return (
    <section
      aria-labelledby="meeting-ai-title"
      className="flex min-w-0 flex-1 flex-col gap-4 rounded-ds-lg border border-ds-line bg-ds-surface p-5 md:gap-5 md:rounded-ds-xl md:p-6"
    >
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2
            id="meeting-ai-title"
            className="text-lg font-bold text-ds-ink md:text-xl"
          >
            ИИ-анализ
          </h2>
          <div role="status" aria-live="polite">
            <Badge tone={badge.tone} icon={badge.icon}>
              {getAiStatusLabel(meeting.aiStatus, meeting.aiError)}
            </Badge>
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Разделы ИИ-анализа"
          className="flex gap-0.5 rounded-[10px] bg-ds-sunken p-[3px]"
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              aria-controls={`${baseId}-panel-${tab.id}`}
              className={TAB_CLASSES}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Tab>
          ))}
        </div>
      </div>

      {meeting.aiStatus === AiProcessingStatus.FAILED && (
        <InlineAlert title="Не удалось выполнить ИИ-анализ">
          {meeting.aiError}
        </InlineAlert>
      )}

      {isSkipped && (
        <InlineAlert tone="warning" title="ИИ-анализ отключён">
          Запустите Ollama и скачайте модель (ollama pull
          qwen3:4b-instruct-2507-q4_K_M), чтобы получать выжимку, задачи и
          решения автоматически.
        </InlineAlert>
      )}

      <Panel
        id={`${baseId}-panel-${InsightTab.SUMMARY}`}
        tabId={`${baseId}-tab-${InsightTab.SUMMARY}`}
        isActive={activeTab === InsightTab.SUMMARY}
      >
        {meeting.summary ? (
          <p className="rounded-ds-lg bg-ds-bg p-5 text-sm leading-relaxed break-words whitespace-pre-line text-ds-ink">
            {meeting.summary}
          </p>
        ) : (
          <EmptyState
            title="Выжимки пока нет"
            text={
              isDone
                ? nothingFound
                : 'Загрузите запись встречи — после расшифровки здесь появятся краткая выжимка, задачи и решения.'
            }
          />
        )}
      </Panel>

      <Panel
        id={`${baseId}-panel-${InsightTab.TASKS}`}
        tabId={`${baseId}-tab-${InsightTab.TASKS}`}
        isActive={activeTab === InsightTab.TASKS}
      >
        {meeting.tasks.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {meeting.tasks.map((task) => (
              <li key={task.id}>
                <TaskItem
                  title={task.title}
                  isDone={task.status === TaskStatus.DONE}
                  meta={
                    task.assignee
                      ? `Ответственный: ${task.assignee}`
                      : 'Ответственный не назначен'
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Задач пока нет"
            text={isDone ? nothingFound : 'Задачи появятся после ИИ-анализа.'}
          />
        )}
      </Panel>

      <Panel
        id={`${baseId}-panel-${InsightTab.DECISIONS}`}
        tabId={`${baseId}-tab-${InsightTab.DECISIONS}`}
        isActive={activeTab === InsightTab.DECISIONS}
      >
        {meeting.decisions.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {meeting.decisions.map((decision, index) => (
              <li
                key={`${index}-${decision}`}
                className="rounded-ds-md bg-ds-bg px-4 py-3.5 text-sm font-semibold break-words text-ds-ink"
              >
                {decision}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Решений пока нет"
            text={isDone ? nothingFound : 'Решения появятся после ИИ-анализа.'}
          />
        )}
      </Panel>
    </section>
  );
}
