import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AiProcessingStatus,
  TaskStatus,
  type MeetingDetailResponse,
} from '@/lib/api';
import { MeetingAiInsights } from './meeting-ai-insights';

const base: MeetingDetailResponse = {
  id: 'm1',
  title: 'T',
  date: '2026-11-01T10:00:00.000Z',
  participants: [],
  summary: null,
  decisions: [],
  aiStatus: AiProcessingStatus.PENDING,
  aiError: null,
  tasks: [],
};

afterEach(cleanup);

describe('MeetingAiInsights', () => {
  it('shows summary, tasks with assignee and decisions', () => {
    render(
      <MeetingAiInsights
        meeting={{
          ...base,
          aiStatus: AiProcessingStatus.DONE,
          summary: 'Обсудили релиз',
          decisions: ['Релиз в пятницу'],
          tasks: [
            {
              id: 't1',
              title: 'Подготовить релиз',
              assignee: 'Анна',
              status: TaskStatus.OPEN,
              sourceMeetingId: 'm1',
              createdAt: '2026-11-01T10:00:00.000Z',
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('Обсудили релиз')).toBeTruthy();
    expect(screen.getByText('Подготовить релиз')).toBeTruthy();
    expect(screen.getByText('Ответственный: Анна')).toBeTruthy();
    expect(screen.getByText('Релиз в пятницу')).toBeTruthy();
    expect(screen.getByText('ИИ-анализ готов')).toBeTruthy();
  });

  it('shows a soft hint, not an error, when AI is not configured', () => {
    render(
      <MeetingAiInsights
        meeting={{ ...base, aiError: 'AI processing is not configured' }}
      />,
    );
    expect(screen.getAllByText('ИИ-анализ не настроен').length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText('Не удалось выполнить ИИ-анализ')).toBeNull();
  });

  it('shows the error for FAILED', () => {
    render(
      <MeetingAiInsights
        meeting={{
          ...base,
          aiStatus: AiProcessingStatus.FAILED,
          aiError: 'boom',
        }}
      />,
    );
    expect(screen.getByText('boom')).toBeTruthy();
    expect(screen.getByText('Ошибка ИИ-анализа')).toBeTruthy();
  });
});
