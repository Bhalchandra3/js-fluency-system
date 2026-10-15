// api/_lib/scheduling/g5Aggregation.ts

import { ConfidenceLevel } from '../../../generated/prisma/enums.js';
import { SchedulingError } from './errors.js';
import {
    advanceInterval,
    assertLadderInterval,
    reinforceInterval,
    resetInterval,
    type LadderInterval,
} from './intervalLadder.js';

/** Matches approved RevisionSessionOutcome (schema not applied yet). */
export const SchedulingOutcome = {
    ADVANCE: 'ADVANCE',
    REINFORCE: 'REINFORCE',
    REINFORCE_AT_1: 'REINFORCE_AT_1',
    RESET: 'RESET',
} as const;

export type SchedulingOutcome =
    (typeof SchedulingOutcome)[keyof typeof SchedulingOutcome];

export const G5_POLICY_VERSION = 'phase3-g5-v1';

const CONFIDENCE_VALUES = new Set<string>(Object.values(ConfidenceLevel));

export type SessionAnswerInput = {
    /** Independent of confidence — must be an explicit boolean. */
    correct: boolean;
    confidence: ConfidenceLevel;
};

export type G5AggregationResult = {
    outcome: SchedulingOutcome;
    previousIntervalDays: LadderInterval;
    resultingIntervalDays: LadderInterval;
    policyVersion: typeof G5_POLICY_VERSION;
    reason: string;
};

function assertConfidence(value: unknown): ConfidenceLevel {
    if (typeof value !== 'string' || !CONFIDENCE_VALUES.has(value)) {
        throw new SchedulingError(
            'INVALID_CONFIDENCE',
            `confidence must be one of ${[...CONFIDENCE_VALUES].join(', ')}; received ${String(value)}`,
        );
    }

    return value as ConfidenceLevel;
}

function assertAnswer(answer: unknown, index: number): SessionAnswerInput {
    if (answer === null || typeof answer !== 'object') {
        throw new SchedulingError(
            'INVALID_ANSWER',
            `answers[${index}] must be an object`,
        );
    }

    const record = answer as Record<string, unknown>;

    if (typeof record['correct'] !== 'boolean') {
        throw new SchedulingError(
            'INVALID_ANSWER',
            `answers[${index}].correct must be a boolean; received ${String(record['correct'])}`,
        );
    }

    return {
        correct: record['correct'],
        confidence: assertConfidence(record['confidence']),
    };
}

/**
 * Deterministic G5 session aggregation.
 * Priority: any incorrect → RESET; else any DIDNT_UNDERSTAND → REINFORCE_AT_1;
 * else any DIFFICULT → REINFORCE; else ADVANCE.
 * Does not read or write the database. Empty collections are rejected.
 */
export function aggregateG5SessionOutcome(
    currentIntervalDays: number,
    answers: readonly SessionAnswerInput[],
): G5AggregationResult {
    const previousIntervalDays = assertLadderInterval(currentIntervalDays);

    if (!Array.isArray(answers)) {
        throw new SchedulingError(
            'INVALID_ANSWERS',
            'answers must be a non-empty array',
        );
    }

    if (answers.length === 0) {
        throw new SchedulingError(
            'EMPTY_ANSWERS',
            'Cannot aggregate scheduling outcome from an empty answer collection',
        );
    }

    const normalized = answers.map((answer, index) => assertAnswer(answer, index));

    if (normalized.some((answer) => answer.correct === false)) {
        return {
            outcome: SchedulingOutcome.RESET,
            previousIntervalDays,
            resultingIntervalDays: resetInterval(previousIntervalDays),
            policyVersion: G5_POLICY_VERSION,
            reason: 'Reset to 1 day because at least one answer was incorrect',
        };
    }

    if (
        normalized.some(
            (answer) => answer.confidence === ConfidenceLevel.DIDNT_UNDERSTAND,
        )
    ) {
        return {
            outcome: SchedulingOutcome.REINFORCE_AT_1,
            previousIntervalDays,
            resultingIntervalDays: 1,
            policyVersion: G5_POLICY_VERSION,
            reason: 'Reinforce at 1 day because at least one answer had DIDNT_UNDERSTAND confidence',
        };
    }

    if (
        normalized.some((answer) => answer.confidence === ConfidenceLevel.DIFFICULT)
    ) {
        return {
            outcome: SchedulingOutcome.REINFORCE,
            previousIntervalDays,
            resultingIntervalDays: reinforceInterval(previousIntervalDays),
            policyVersion: G5_POLICY_VERSION,
            reason: 'Reinforce one ladder step because at least one answer had DIFFICULT confidence',
        };
    }

    return {
        outcome: SchedulingOutcome.ADVANCE,
        previousIntervalDays,
        resultingIntervalDays: advanceInterval(previousIntervalDays),
        policyVersion: G5_POLICY_VERSION,
        reason: 'Advance one ladder step; all answers correct with OKAY or EASY confidence',
    };
}
