import type {
  DeepDiveNoteResponse,
  DeleteDeepDiveResponse,
  ListDeepDiveResponse,
} from '../deep-dive.types';
import type {
  ListMistakesResponse,
  MistakeDetailResponse,
} from '../mistake.types';
import type { ProgressSummaryResponse } from '../progress.types';

export const listMistakesFixture: ListMistakesResponse = {
  status: 'ok',
  total: 1,
  mistakes: [
    {
      id: 'mistake-fixture-1',
      topicId: 'topic-fixture-1',
      questionId: 'question-fixture-1',
      sessionId: 'session-fixture-1',
      sourceSessionLogId: 'log-fixture-1',
      mistakeText: 'Answered incorrectly',
      correctUnderstanding: 'Review the topic materials for the correct understanding.',
      turnedIntoQuestion: false,
      resolvedAt: null,
      createdAt: '2026-10-24T10:00:00.000Z',
    },
  ],
};

export const mistakeDetailFixture: MistakeDetailResponse = {
  status: 'ok',
  mistake: {
    ...listMistakesFixture.mistakes[0],
    questionId: null,
    sessionId: null,
    sourceSessionLogId: null,
    topic: {
      id: 'topic-fixture-1',
      name: 'Closures',
      slug: 'closures',
    },
  },
};

export const listDeepDiveFixture: ListDeepDiveResponse = {
  status: 'ok',
  notes: [
    {
      id: 'note-fixture-1',
      topicId: 'topic-fixture-1',
      reason: '[phase4-status-v1] Session RESET — incorrect answer(s)',
      notes: null,
      createdAt: '2026-10-24T10:00:00.000Z',
      updatedAt: '2026-10-24T11:00:00.000Z',
      topic: {
        id: 'topic-fixture-1',
        name: 'Closures',
        slug: 'closures',
        status: 'RED',
      },
    },
  ],
};

export const deepDiveNoteFixture: DeepDiveNoteResponse = {
  status: 'ok',
  note: {
    ...listDeepDiveFixture.notes[0],
    notes: 'Owner study notes',
  },
};

export const deleteDeepDiveFixture: DeleteDeepDiveResponse = {
  status: 'ok',
};

export const progressSummaryFixture: ProgressSummaryResponse = {
  status: 'ok',
  statusCounts: { green: 10, yellow: 5, red: 37 },
  deepDiveCount: 2,
  unresolvedMistakeCount: 3,
  dueCount: 4,
  overdueCount: 1,
};
