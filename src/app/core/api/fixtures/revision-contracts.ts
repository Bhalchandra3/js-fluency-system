import type {
  CompleteSessionResponse,
  SubmitAnswerResponse,
  TodayRevisionResponse,
} from '../revision.types';

/** Golden fixture for GET /api/revision/today — must not include answer leakage fields. */
export const todayRevisionFixture: TodayRevisionResponse = {
  status: 'ok',
  dueCount: 2,
  overdueCount: 1,
  session: {
    id: 'session-fixture-1',
    status: 'OPEN',
    topic: {
      id: 'topic-fixture-1',
      name: 'Closures',
      slug: 'closures',
      intervalDays: 3,
      nextRevisionDate: '2026-10-15T18:30:00.000Z',
      isOverdue: true,
    },
    questions: [
      {
        id: 'question-mcq-1',
        format: 'MULTIPLE_CHOICE',
        prompt: 'What does a closure capture?',
        options: ['Nothing', 'Lexical environment', 'Only globals'],
      },
      {
        id: 'question-short-1',
        format: 'SHORT_ANSWER',
        prompt: 'Explain lexical scope in one sentence.',
        codeSnippet: 'function outer() { const x = 1; }',
      },
    ],
    progress: { answered: 0, total: 2 },
    canComplete: false,
  },
};

export const emptyTodayRevisionFixture: TodayRevisionResponse = {
  status: 'ok',
  dueCount: 0,
  overdueCount: 0,
  session: null,
};

export const submitAnswerFixture: SubmitAnswerResponse = {
  status: 'ok',
  correct: true,
  correctAnswer: '1',
  explanation: 'A closure captures its lexical environment.',
  progress: { answered: 1, total: 2 },
  sessionStatus: 'OPEN',
  canComplete: false,
};

export const completeSessionFixture: CompleteSessionResponse = {
  status: 'ok',
  sessionStatus: 'COMPLETED',
  scheduling: {
    outcome: 'REINFORCE',
    previousIntervalDays: 7,
    resultingIntervalDays: 3,
    resultingNextRevisionDate: '2026-10-19T18:30:00.000Z',
    policyVersion: 'phase3-g5-v1',
    reason:
      'Reinforce one ladder step because at least one answer had DIFFICULT confidence',
  },
};

/** Assert helpers used by contract tests (no real credentials). */
export function todayFixtureLeaksAnswerFields(payload: TodayRevisionResponse): boolean {
  const serialized = JSON.stringify(payload);
  return (
    serialized.includes('"correctAnswer"') || serialized.includes('"explanation"')
  );
}
