import {
  aiAnalysisResultSchema,
  ANALYSIS_FORMAT,
  parseAiAnswer,
} from './ai-analysis.schema.js';

describe('parseAiAnswer', () => {
  it('accepts a valid answer', () => {
    const text = JSON.stringify({
      summary: 'S',
      decisions: ['D'],
      tasks: [{ title: 'T', assignee: 'Anna', status: 'OPEN' }],
    });
    expect(parseAiAnswer(text, aiAnalysisResultSchema)?.tasks[0].title).toBe(
      'T',
    );
  });

  it.each([
    ['not json', 'Sure! Here is the result'],
    ['missing field', JSON.stringify({ summary: 'S', decisions: [] })],
    ['wrong type', JSON.stringify({ summary: 'S', decisions: 'D', tasks: [] })],
    [
      'unknown status',
      JSON.stringify({
        summary: 'S',
        decisions: [],
        tasks: [{ title: 'T', status: 'MAYBE' }],
      }),
    ],
  ])('rejects %s', (_name, text) => {
    expect(parseAiAnswer(text, aiAnalysisResultSchema)).toBeNull();
  });

  it('ignores extra fields', () => {
    const text = JSON.stringify({
      summary: 'S',
      decisions: [],
      tasks: [],
      meetingId: 'other',
    });
    expect(parseAiAnswer(text, aiAnalysisResultSchema)).toEqual({
      summary: 'S',
      decisions: [],
      tasks: [],
    });
  });
});

describe('ANALYSIS_FORMAT', () => {
  it('is a plain JSON Schema object for Ollama', () => {
    expect(ANALYSIS_FORMAT.type).toBe('object');
    expect(ANALYSIS_FORMAT).not.toHaveProperty('$schema');
    expect(ANALYSIS_FORMAT.required).toEqual(['summary', 'decisions', 'tasks']);
  });
});
