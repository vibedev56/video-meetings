import {
  MAX_DECISIONS,
  MAX_SUMMARY_CHARS,
  MAX_TASKS,
} from './ai-analysis.constants.js';
import { MAX_TASK_TITLE_LENGTH } from '../tasks/tasks.constants.js';
import {
  normalizeDecisions,
  normalizeSummary,
  selectTasks,
} from './ai-result.normalizer.js';

describe('normalizeDecisions', () => {
  it('trims, drops empty and duplicate items', () => {
    expect(normalizeDecisions([' Ship ', 'ship', '', 'Test'])).toEqual([
      'Ship',
      'Test',
    ]);
  });

  it('keeps at most MAX_DECISIONS', () => {
    const many = Array.from({ length: MAX_DECISIONS + 5 }, (_, i) => `d${i}`);
    expect(normalizeDecisions(many)).toHaveLength(MAX_DECISIONS);
  });
});

describe('normalizeSummary', () => {
  it('trims and limits the length', () => {
    expect(normalizeSummary('  hi  ')).toBe('hi');
    expect(normalizeSummary('x'.repeat(MAX_SUMMARY_CHARS + 10))).toHaveLength(
      MAX_SUMMARY_CHARS,
    );
  });
});

describe('selectTasks', () => {
  it('drops titles shorter than 3 characters', () => {
    expect(selectTasks([{ title: 'ab' }, { title: ' Fix ' }])).toEqual([
      { title: 'Fix' },
    ]);
  });

  it('dedupes by normalized title, first one wins', () => {
    const tasks = selectTasks([
      { title: 'Send  report', assignee: 'Anna' },
      { title: 'send report' },
    ]);
    expect(tasks).toEqual([{ title: 'Send  report', assignee: 'Anna' }]);
  });

  it('truncates long titles to MAX_TASK_TITLE_LENGTH', () => {
    const [task] = selectTasks([
      { title: 'x'.repeat(MAX_TASK_TITLE_LENGTH + 50) },
    ]);
    expect(task.title).toHaveLength(MAX_TASK_TITLE_LENGTH);
  });

  it('dedupes titles that are equal after truncation, as upsert would merge them', () => {
    const prefix = 'a'.repeat(MAX_TASK_TITLE_LENGTH);
    expect(
      selectTasks([{ title: `${prefix} one` }, { title: `${prefix} two` }]),
    ).toHaveLength(1);
  });

  it('keeps long titles that differ inside the limit', () => {
    const tail = 'b'.repeat(MAX_TASK_TITLE_LENGTH - 1);
    expect(
      selectTasks([{ title: `a${tail}` }, { title: `c${tail}` }]),
    ).toHaveLength(2);
  });

  it('keeps at most MAX_TASKS', () => {
    const many = Array.from({ length: MAX_TASKS + 5 }, (_, i) => ({
      title: `Task ${i}`,
    }));
    expect(selectTasks(many)).toHaveLength(MAX_TASKS);
  });
});
