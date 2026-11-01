/** Frontend-local DTOs matching Phase 4 Deep Dive Queue API contracts. */

export type ApiOkStatus = 'ok';

export type TopicStatus = 'GREEN' | 'YELLOW' | 'RED';

export type DeepDiveTopicDto = {
  id: string;
  name: string;
  slug: string;
  status: TopicStatus;
};

export type DeepDiveNoteDto = {
  id: string;
  topicId: string;
  reason: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  topic: DeepDiveTopicDto;
};

export type ListDeepDiveResponse = {
  status: ApiOkStatus;
  notes: DeepDiveNoteDto[];
};

export type DeepDiveNoteResponse = {
  status: ApiOkStatus;
  note: DeepDiveNoteDto;
};

export type DeleteDeepDiveResponse = {
  status: ApiOkStatus;
};

/**
 * Body for PATCH /api/deep-dive/:topicId.
 * `notes: null` clears owner notes; empty string is allowed by the backend.
 */
export type UpdateDeepDiveRequestBody = {
  reason?: string;
  notes?: string | null;
};
