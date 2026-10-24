// api/_lib/status/phase4StatusV1.test.ts

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TopicStatus } from '../../../generated/prisma/enums.js';
import { SchedulingOutcome } from '../scheduling/g5Aggregation.js';
import { StatusError } from './errors.js';
import {
    STATUS_POLICY_VERSION,
    mapG5OutcomeToTopicStatus,
    retainStatusWithoutCompletedSession,
} from './phase4StatusV1.js';

describe('phase4-status-v1', () => {
    it('maps ADVANCE → GREEN', () => {
        const result = mapG5OutcomeToTopicStatus(SchedulingOutcome.ADVANCE);
        assert.equal(result.status, TopicStatus.GREEN);
        assert.equal(result.policyVersion, STATUS_POLICY_VERSION);
        assert.equal(result.policyVersion, 'phase4-status-v1');
        assert.match(result.reason, /ADVANCE/);
        assert.match(result.reason, /GREEN/);
        assert.equal(result.previousStatus, undefined);
    });

    it('maps REINFORCE → YELLOW', () => {
        const result = mapG5OutcomeToTopicStatus(SchedulingOutcome.REINFORCE);
        assert.equal(result.status, TopicStatus.YELLOW);
        assert.equal(result.policyVersion, STATUS_POLICY_VERSION);
        assert.match(result.reason, /REINFORCE/);
        assert.match(result.reason, /YELLOW/);
    });

    it('maps REINFORCE_AT_1 → RED', () => {
        const result = mapG5OutcomeToTopicStatus(SchedulingOutcome.REINFORCE_AT_1);
        assert.equal(result.status, TopicStatus.RED);
        assert.equal(result.policyVersion, STATUS_POLICY_VERSION);
        assert.match(result.reason, /REINFORCE_AT_1/);
        assert.match(result.reason, /RED/);
    });

    it('maps RESET → RED', () => {
        const result = mapG5OutcomeToTopicStatus(SchedulingOutcome.RESET);
        assert.equal(result.status, TopicStatus.RED);
        assert.equal(result.policyVersion, STATUS_POLICY_VERSION);
        assert.match(result.reason, /RESET/);
        assert.match(result.reason, /RED/);
    });

    it('covers every SchedulingOutcome value exactly once in the mapping table', () => {
        const expected: Record<string, TopicStatus> = {
            [SchedulingOutcome.ADVANCE]: TopicStatus.GREEN,
            [SchedulingOutcome.REINFORCE]: TopicStatus.YELLOW,
            [SchedulingOutcome.REINFORCE_AT_1]: TopicStatus.RED,
            [SchedulingOutcome.RESET]: TopicStatus.RED,
        };

        const outcomes = Object.values(SchedulingOutcome);
        assert.equal(outcomes.length, 4);
        for (const outcome of outcomes) {
            assert.equal(
                mapG5OutcomeToTopicStatus(outcome).status,
                expected[outcome],
            );
        }
    });

    it('is deterministic for the same outcome', () => {
        const a = mapG5OutcomeToTopicStatus(SchedulingOutcome.ADVANCE);
        const b = mapG5OutcomeToTopicStatus(SchedulingOutcome.ADVANCE);
        assert.deepEqual(a, b);
    });

    it('includes previousStatus in reason without hysteresis', () => {
        const fromRed = mapG5OutcomeToTopicStatus(
            SchedulingOutcome.ADVANCE,
            TopicStatus.RED,
        );
        assert.equal(fromRed.status, TopicStatus.GREEN);
        assert.equal(fromRed.previousStatus, TopicStatus.RED);
        assert.match(fromRed.reason, /was RED/);

        const fromGreen = mapG5OutcomeToTopicStatus(
            SchedulingOutcome.RESET,
            TopicStatus.GREEN,
        );
        assert.equal(fromGreen.status, TopicStatus.RED);
        assert.equal(fromGreen.previousStatus, TopicStatus.GREEN);
        assert.match(fromGreen.reason, /was GREEN/);
    });

    it('rejects invalid or unsupported outcomes', () => {
        assert.throws(
            () => mapG5OutcomeToTopicStatus('ADVANCE_HARD'),
            (error: unknown) =>
                error instanceof StatusError && error.code === 'INVALID_OUTCOME',
        );
        assert.throws(
            () => mapG5OutcomeToTopicStatus(null),
            StatusError,
        );
        assert.throws(
            () => mapG5OutcomeToTopicStatus(undefined),
            StatusError,
        );
        assert.throws(
            () => mapG5OutcomeToTopicStatus(42),
            StatusError,
        );
    });

    it('rejects invalid previousStatus when provided', () => {
        assert.throws(
            () => mapG5OutcomeToTopicStatus(SchedulingOutcome.ADVANCE, 'BLUE'),
            (error: unknown) =>
                error instanceof StatusError &&
                error.code === 'INVALID_TOPIC_STATUS',
        );
    });

    it('retains status when there is insufficient completed-session history', () => {
        assert.equal(
            retainStatusWithoutCompletedSession(TopicStatus.RED),
            TopicStatus.RED,
        );
        assert.equal(
            retainStatusWithoutCompletedSession(TopicStatus.GREEN),
            TopicStatus.GREEN,
        );
        assert.throws(
            () => retainStatusWithoutCompletedSession('ORANGE'),
            (error: unknown) =>
                error instanceof StatusError &&
                error.code === 'INVALID_TOPIC_STATUS',
        );
    });
});
