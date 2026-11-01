/** Frontend-local DTOs matching Phase 4 GET /api/progress contract. */

export type ApiOkStatus = 'ok';

export type ProgressStatusCounts = {
  green: number;
  yellow: number;
  red: number;
};

export type ProgressSummaryResponse = {
  status: ApiOkStatus;
  statusCounts: ProgressStatusCounts;
  deepDiveCount: number;
  unresolvedMistakeCount: number;
  dueCount: number;
  overdueCount: number;
};
