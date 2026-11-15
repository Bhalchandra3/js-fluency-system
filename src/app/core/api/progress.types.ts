/** Frontend-local DTOs matching GET /api/progress (Phase 4 + Phase 7 escalations). */

export type ApiOkStatus = 'ok';

export type ProgressStatusCounts = {
  green: number;
  yellow: number;
  red: number;
};

export type PatternGateSignalCode =
  | 'REPEATED_RED'
  | 'UNRESOLVED_MISTAKE_CLUSTER'
  | 'REPEATED_QUESTION_MISS'
  | 'THIN_MCQ_COVERAGE';

export type TopicStatusCode = 'GREEN' | 'YELLOW' | 'RED';

export type ProgressEscalation = {
  topicId: string;
  topicName: string;
  topicSlug: string;
  status: TopicStatusCode;
  gates: PatternGateSignalCode[];
  unresolvedMistakeCount: number;
  revisionMcqCount: number;
};

export type ProgressSummaryResponse = {
  status: ApiOkStatus;
  statusCounts: ProgressStatusCounts;
  deepDiveCount: number;
  unresolvedMistakeCount: number;
  dueCount: number;
  overdueCount: number;
  patternGateVersion: 'phase7-pattern-gate-v1';
  escalations: ProgressEscalation[];
};

/** Primary CTA for the highest-severity gate on a card (Phase 7 §2.5.4). */
export function escalationPrimaryPath(
  gates: readonly PatternGateSignalCode[],
): '/mistakes' | '/deep-dive' | null {
  const top = gates[0];
  if (top === 'REPEATED_RED') {
    return '/deep-dive';
  }
  if (
    top === 'UNRESOLVED_MISTAKE_CLUSTER' ||
    top === 'REPEATED_QUESTION_MISS'
  ) {
    return '/mistakes';
  }
  // THIN_MCQ_COVERAGE → offline bank work; no forced in-app route
  return null;
}

export function escalationGateLabel(gate: PatternGateSignalCode): string {
  switch (gate) {
    case 'REPEATED_RED':
      return 'Repeated red sessions';
    case 'UNRESOLVED_MISTAKE_CLUSTER':
      return 'Unresolved mistake cluster';
    case 'REPEATED_QUESTION_MISS':
      return 'Repeated question miss';
    case 'THIN_MCQ_COVERAGE':
      return 'Thin MCQ coverage';
    default: {
      const _exhaustive: never = gate;
      return _exhaustive;
    }
  }
}
