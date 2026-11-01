/** Frontend-local DTOs for GET /api/topics (fields used by Mistake Log create/list). */

export type ApiOkStatus = 'ok';

export type TopicListItemDto = {
  id: string;
  name: string;
  slug: string;
};

export type ListTopicsResponse = {
  status: ApiOkStatus;
  topics: TopicListItemDto[];
};
