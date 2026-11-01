/** Frontend-local DTOs matching Phase 4 Mistake Log API contracts. */

export type ApiOkStatus = 'ok';

export type MistakeListItemDto = {
  id: string;
  topicId: string;
  questionId: string | null;
  sessionId: string | null;
  sourceSessionLogId: string | null;
  mistakeText: string;
  correctUnderstanding: string;
  turnedIntoQuestion: boolean;
  resolvedAt: string | null;
  createdAt: string;
};

export type MistakeDetailDto = MistakeListItemDto & {
  topic: { id: string; name: string; slug: string };
};

export type ListMistakesResponse = {
  status: ApiOkStatus;
  mistakes: MistakeListItemDto[];
  total: number;
};

export type MistakeDetailResponse = {
  status: ApiOkStatus;
  mistake: MistakeDetailDto;
};

/** Query params for GET /api/mistakes. */
export type ListMistakesQuery = {
  topicId?: string;
  unresolvedOnly?: boolean;
  /** Default 50, max 200 on the backend. */
  limit?: number;
  /** Default 0 on the backend. */
  offset?: number;
};

/** Body for POST /api/mistakes (manual create). */
export type CreateMistakeRequestBody = {
  topicId: string;
  mistakeText: string;
  correctUnderstanding: string;
  questionId?: string;
};

/**
 * Body for PATCH /api/mistakes/:id.
 * `resolved: true` sets resolvedAt; `resolved: false` clears it.
 */
export type UpdateMistakeRequestBody = {
  mistakeText?: string;
  correctUnderstanding?: string;
  turnedIntoQuestion?: boolean;
  resolved?: boolean;
};
