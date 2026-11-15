// api/_lib/patternGate/phase7PatternGateV1.ts
// Pure phase7-pattern-gate-v1: deterministic escalate signals from snapshots.
// No database, HTTP, or schedule/status mutations.

import { TopicStatus } from '../../../generated/prisma/enums.js';
import {
    SchedulingOutcome,
    type SchedulingOutcome as SchedulingOutcomeType,
} from '../scheduling/g5Aggregation.js';

export const PATTERN_GATE_VERSION = 'phase7-pattern-gate-v1' as const;

export const PatternGateSignal = {
    REPEATED_RED: 'REPEATED_RED',
    UNRESOLVED_MISTAKE_CLUSTER: 'UNRESOLVED_MISTAKE_CLUSTER',
    REPEATED_QUESTION_MISS: 'REPEATED_QUESTION_MISS',
    THIN_MCQ_COVERAGE: 'THIN_MCQ_COVERAGE',
} as const;

export type PatternGateSignal =
    (typeof PatternGateSignal)[keyof typeof PatternGateSignal];

/** Locked thresholds — Development Order §2.5.4. Do not change without Step 1 re-lock. */
export const PATTERN_GATE_THRESHOLDS = {
    unresolvedMistakeMin: 3,
    redRepeatCompletedSessions: 2,
    questionMissMin: 2,
    /** Fire when revision MCQ count is strictly less than this. */
    thinMcqBelow: 3,
    presentationCap: 5,
} as const;

const RED_OUTCOMES = new Set<SchedulingOutcomeType>([
    SchedulingOutcome.RESET,
    SchedulingOutcome.REINFORCE_AT_1,
]);

/** Highest severity first (index 0 = most severe). */
export const PATTERN_GATE_SEVERITY_ORDER: readonly PatternGateSignal[] = [
    PatternGateSignal.REPEATED_RED,
    PatternGateSignal.UNRESOLVED_MISTAKE_CLUSTER,
    PatternGateSignal.REPEATED_QUESTION_MISS,
    PatternGateSignal.THIN_MCQ_COVERAGE,
] as const;

const SEVERITY_RANK = new Map<PatternGateSignal, number>(
    PATTERN_GATE_SEVERITY_ORDER.map((signal, index) => [signal, index]),
);

export type TopicGateInput = {
    topicId: string;
    topicName: string;
    topicSlug: string;
    status: TopicStatus;
    unresolvedMistakeCount: number;
    revisionMcqCount: number;
    /**
     * Completed-session outcomes newest-first.
     * Gate uses the first two entries only; fewer than two → REPEATED_RED does not fire.
     */
    recentCompletedOutcomes: ReadonlyArray<SchedulingOutcomeType | null | undefined>;
    /** Max count of SessionLog rows with correct===false for any single questionId on this topic. */
    maxIncorrectCountOnAnyQuestion: number;
};

export type TopicEscalation = {
    topicId: string;
    topicName: string;
    topicSlug: string;
    status: TopicStatus;
    gates: PatternGateSignal[];
    unresolvedMistakeCount: number;
    revisionMcqCount: number;
};

export function isRedSchedulingOutcome(
    outcome: SchedulingOutcomeType | null | undefined,
): boolean {
    return outcome != null && RED_OUTCOMES.has(outcome);
}

export function firesUnresolvedMistakeCluster(unresolvedMistakeCount: number): boolean {
    return unresolvedMistakeCount >= PATTERN_GATE_THRESHOLDS.unresolvedMistakeMin;
}

/**
 * Two most recent completed outcomes (newest first) are both RESET or REINFORCE_AT_1.
 */
export function firesRepeatedRed(
    recentCompletedOutcomes: ReadonlyArray<SchedulingOutcomeType | null | undefined>,
): boolean {
    const needed = PATTERN_GATE_THRESHOLDS.redRepeatCompletedSessions;
    if (recentCompletedOutcomes.length < needed) {
        return false;
    }
    const a = recentCompletedOutcomes[0];
    const b = recentCompletedOutcomes[1];
    return isRedSchedulingOutcome(a) && isRedSchedulingOutcome(b);
}

export function firesRepeatedQuestionMiss(maxIncorrectCountOnAnyQuestion: number): boolean {
    return maxIncorrectCountOnAnyQuestion >= PATTERN_GATE_THRESHOLDS.questionMissMin;
}

export function firesThinMcqCoverage(input: {
    revisionMcqCount: number;
    status: TopicStatus;
    unresolvedMistakeCount: number;
}): boolean {
    if (input.revisionMcqCount >= PATTERN_GATE_THRESHOLDS.thinMcqBelow) {
        return false;
    }
    return input.status === TopicStatus.RED || input.unresolvedMistakeCount >= 1;
}

/**
 * Evaluate all gates for one topic. Returns signal codes in severity order (no duplicates).
 */
export function evaluateTopicGates(input: TopicGateInput): PatternGateSignal[] {
    const fired: PatternGateSignal[] = [];

    if (firesRepeatedRed(input.recentCompletedOutcomes)) {
        fired.push(PatternGateSignal.REPEATED_RED);
    }
    if (firesUnresolvedMistakeCluster(input.unresolvedMistakeCount)) {
        fired.push(PatternGateSignal.UNRESOLVED_MISTAKE_CLUSTER);
    }
    if (firesRepeatedQuestionMiss(input.maxIncorrectCountOnAnyQuestion)) {
        fired.push(PatternGateSignal.REPEATED_QUESTION_MISS);
    }
    if (
        firesThinMcqCoverage({
            revisionMcqCount: input.revisionMcqCount,
            status: input.status,
            unresolvedMistakeCount: input.unresolvedMistakeCount,
        })
    ) {
        fired.push(PatternGateSignal.THIN_MCQ_COVERAGE);
    }

    return fired;
}

function highestSeverityRank(gates: readonly PatternGateSignal[]): number {
    let best = Number.POSITIVE_INFINITY;
    for (const gate of gates) {
        const rank = SEVERITY_RANK.get(gate);
        if (rank !== undefined && rank < best) {
            best = rank;
        }
    }
    return best;
}

/**
 * Build escalation cards for topics that fire ≥1 gate, sorted by severity then topicSlug,
 * capped at presentationCap (default 5).
 */
export function buildEscalations(
    topics: ReadonlyArray<TopicGateInput>,
    presentationCap: number = PATTERN_GATE_THRESHOLDS.presentationCap,
): TopicEscalation[] {
    const items: TopicEscalation[] = [];

    for (const topic of topics) {
        const gates = evaluateTopicGates(topic);
        if (gates.length === 0) {
            continue;
        }
        items.push({
            topicId: topic.topicId,
            topicName: topic.topicName,
            topicSlug: topic.topicSlug,
            status: topic.status,
            gates,
            unresolvedMistakeCount: topic.unresolvedMistakeCount,
            revisionMcqCount: topic.revisionMcqCount,
        });
    }

    items.sort((a, b) => {
        const rankDiff = highestSeverityRank(a.gates) - highestSeverityRank(b.gates);
        if (rankDiff !== 0) {
            return rankDiff;
        }
        return a.topicSlug.localeCompare(b.topicSlug);
    });

    const cap = Math.max(0, presentationCap);
    return items.slice(0, cap);
}
