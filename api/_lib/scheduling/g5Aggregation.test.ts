// api/_lib/scheduling/g5Aggregation.test.ts

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfidenceLevel } from '../../../generated/prisma/enums.js';
import { SchedulingError } from './errors.js';
import {
    SchedulingOutcome,
    aggregateG5SessionOutcome,
    type SessionAnswerInput,
} from './g5Aggregation.js';

function answer(
    correct: boolean,
    confidence: SessionAnswerInput['confidence'],
): SessionAnswerInput {
    return { correct, confidence };
}

describe('G5 aggregation', () => {
    it('advances when all correct with OKAY/EASY at interval 7 → 14', () => {
        const result = aggregateG5SessionOutcome(7, [
            answer(true, ConfidenceLevel.OKAY),
            answer(true, ConfidenceLevel.EASY),
        ]);

        assert.equal(result.outcome, SchedulingOutcome.ADVANCE);
        assert.equal(result.resultingIntervalDays, 14);
        assert.equal(result.previousIntervalDays, 7);
    });

    it('reinforces when any DIFFICULT among all correct at 7 → 3', () => {
        const result = aggregateG5SessionOutcome(7, [
            answer(true, ConfidenceLevel.DIFFICULT),
            answer(true, ConfidenceLevel.OKAY),
        ]);

        assert.equal(result.outcome, SchedulingOutcome.REINFORCE);
        assert.equal(result.resultingIntervalDays, 3);
    });

    it('reinforces at 1 when any DIDNT_UNDERSTAND among all correct', () => {
        const result = aggregateG5SessionOutcome(7, [
            answer(true, ConfidenceLevel.DIDNT_UNDERSTAND),
            answer(true, ConfidenceLevel.EASY),
        ]);

        assert.equal(result.outcome, SchedulingOutcome.REINFORCE_AT_1);
        assert.equal(result.resultingIntervalDays, 1);
    });

    it('resets when any incorrect, regardless of Easy confidence', () => {
        const result = aggregateG5SessionOutcome(7, [
            answer(false, ConfidenceLevel.EASY),
            answer(true, ConfidenceLevel.EASY),
        ]);

        assert.equal(result.outcome, SchedulingOutcome.RESET);
        assert.equal(result.resultingIntervalDays, 1);
    });

    it('gives incorrect priority over DIDNT_UNDERSTAND and DIFFICULT', () => {
        const result = aggregateG5SessionOutcome(14, [
            answer(true, ConfidenceLevel.DIDNT_UNDERSTAND),
            answer(false, ConfidenceLevel.DIFFICULT),
            answer(true, ConfidenceLevel.EASY),
        ]);

        assert.equal(result.outcome, SchedulingOutcome.RESET);
        assert.equal(result.resultingIntervalDays, 1);
    });

    it('gives DIDNT_UNDERSTAND priority over DIFFICULT when all correct', () => {
        const result = aggregateG5SessionOutcome(30, [
            answer(true, ConfidenceLevel.DIFFICULT),
            answer(true, ConfidenceLevel.DIDNT_UNDERSTAND),
        ]);

        assert.equal(result.outcome, SchedulingOutcome.REINFORCE_AT_1);
        assert.equal(result.resultingIntervalDays, 1);
    });

    it('gives DIFFICULT priority over OKAY/EASY when all correct', () => {
        const result = aggregateG5SessionOutcome(3, [
            answer(true, ConfidenceLevel.EASY),
            answer(true, ConfidenceLevel.DIFFICULT),
            answer(true, ConfidenceLevel.OKAY),
        ]);

        assert.equal(result.outcome, SchedulingOutcome.REINFORCE);
        assert.equal(result.resultingIntervalDays, 1);
    });

    it('is order-independent for mixed answers', () => {
        const a = [
            answer(true, ConfidenceLevel.EASY),
            answer(true, ConfidenceLevel.DIFFICULT),
        ];
        const b = [
            answer(true, ConfidenceLevel.DIFFICULT),
            answer(true, ConfidenceLevel.EASY),
        ];

        assert.deepEqual(
            aggregateG5SessionOutcome(7, a),
            aggregateG5SessionOutcome(7, b),
        );
    });

    it('caps advance at 30 and floors reinforce at 1', () => {
        assert.equal(
            aggregateG5SessionOutcome(30, [
                answer(true, ConfidenceLevel.EASY),
            ]).resultingIntervalDays,
            30,
        );
        assert.equal(
            aggregateG5SessionOutcome(1, [
                answer(true, ConfidenceLevel.DIFFICULT),
            ]).resultingIntervalDays,
            1,
        );
    });

    it('rejects empty answer collections', () => {
        assert.throws(
            () => aggregateG5SessionOutcome(7, []),
            (error: unknown) =>
                error instanceof SchedulingError && error.code === 'EMPTY_ANSWERS',
        );
    });

    it('rejects missing correctness', () => {
        assert.throws(
            () =>
                aggregateG5SessionOutcome(7, [
                    { confidence: ConfidenceLevel.EASY } as SessionAnswerInput,
                ]),
            (error: unknown) =>
                error instanceof SchedulingError && error.code === 'INVALID_ANSWER',
        );
    });

    it('rejects invalid confidence and interval values', () => {
        assert.throws(
            () =>
                aggregateG5SessionOutcome(7, [
                    { correct: true, confidence: 'HARD' as never },
                ]),
            SchedulingError,
        );
        assert.throws(
            () =>
                aggregateG5SessionOutcome(2, [
                    answer(true, ConfidenceLevel.EASY),
                ]),
            (error: unknown) =>
                error instanceof SchedulingError &&
                error.code === 'INVALID_INTERVAL',
        );
    });
});
