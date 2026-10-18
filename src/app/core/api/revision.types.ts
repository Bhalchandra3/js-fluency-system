/** Frontend-local DTOs matching Phase 3 revision API contracts. */

export type ApiOkStatus = 'ok';

export type ConfidenceLevel = 'EASY' | 'OKAY' | 'DIFFICULT' | 'DIDNT_UNDERSTAND';

export type SchedulingOutcome =
  | 'ADVANCE'
  | 'REINFORCE'
  | 'REINFORCE_AT_1'
  | 'RESET';

/** Formats evaluated by POST /api/revision/answers today. */
export type RevisionAnswerFormat = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';

/** Formats that may appear on GET /api/revision/today. */
export type QuestionFormat =
  | RevisionAnswerFormat
  | 'OUTPUT_PREDICTION'
  | 'CODE_WRITING'
  | 'DEBUGGING';

export type TodayQuestionDto = {
  id: string;
  format: QuestionFormat;
  prompt: string;
  /** Present only when the backend includes options (typically MCQ). */
  options?: unknown;
  /** Present only when the backend includes a non-null snippet. */
  codeSnippet?: string;
};

export type TodaySessionTopicDto = {
  id: string;
  name: string;
  slug: string;
  intervalDays: number;
  nextRevisionDate: string;
  isOverdue: boolean;
};

export type TodaySessionDto = {
  id: string;
  status: 'OPEN';
  topic: TodaySessionTopicDto;
  questions: TodayQuestionDto[];
  progress: { answered: number; total: number };
  canComplete: boolean;
};

export type TodayRevisionResponse = {
  status: ApiOkStatus;
  dueCount: number;
  overdueCount: number;
  session: TodaySessionDto | null;
};

export type SubmitAnswerInput = {
  sessionId: string;
  questionId: string;
  selectedAnswer: string;
  confidence: ConfidenceLevel;
  format: RevisionAnswerFormat;
  /** Required when format is SHORT_ANSWER; must not be sent for MULTIPLE_CHOICE. */
  selfAssessedCorrect?: boolean;
};

/** Wire body for POST /api/revision/answers (no `format` field). */
export type SubmitAnswerRequestBody = {
  sessionId: string;
  questionId: string;
  selectedAnswer: string;
  confidence: ConfidenceLevel;
  selfAssessedCorrect?: boolean;
};

export type SubmitAnswerResponse = {
  status: ApiOkStatus;
  correct: boolean;
  correctAnswer?: string;
  explanation?: string;
  progress: { answered: number; total: number };
  sessionStatus: 'OPEN';
  canComplete: boolean;
};

export type CompleteSessionRequestBody = {
  sessionId: string;
};

export type CompleteSchedulingDto = {
  outcome: SchedulingOutcome;
  previousIntervalDays: number;
  resultingIntervalDays: number;
  resultingNextRevisionDate: string;
  policyVersion: string;
  reason: string;
};

export type CompleteSessionResponse = {
  status: ApiOkStatus;
  sessionStatus: 'COMPLETED';
  scheduling: CompleteSchedulingDto;
};

/**
 * Runtime check for MCQ option arrays. A TypeScript cast is not validation.
 */
export function asStringOptions(options: unknown): string[] | null {
  if (!Array.isArray(options) || !options.every((item) => typeof item === 'string')) {
    return null;
  }
  return options;
}

/**
 * Build the POST /answers body. Omits `selfAssessedCorrect` for MULTIPLE_CHOICE.
 */
export function buildSubmitAnswerBody(input: SubmitAnswerInput): SubmitAnswerRequestBody {
  if (input.format === 'MULTIPLE_CHOICE') {
    return {
      sessionId: input.sessionId,
      questionId: input.questionId,
      selectedAnswer: input.selectedAnswer,
      confidence: input.confidence,
    };
  }

  if (typeof input.selfAssessedCorrect !== 'boolean') {
    throw new Error('selfAssessedCorrect boolean is required for SHORT_ANSWER');
  }

  return {
    sessionId: input.sessionId,
    questionId: input.questionId,
    selectedAnswer: input.selectedAnswer,
    confidence: input.confidence,
    selfAssessedCorrect: input.selfAssessedCorrect,
  };
}
