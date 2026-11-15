// api/_lib/patternGate/phase7PatternGateV1.test.ts

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TopicStatus } from '../../../generated/prisma/enums.js';
import { SchedulingOutcome } from '../scheduling/g5Aggregation.js';
import {
    PATTERN_GATE_THRESHOLDS,
    PATTERN_GATE_VERSION,
    PatternGateSignal,
    buildEscalations,
    evaluateTopicGates,
    firesRepeatedQuestionMiss,
    firesRepeatedRed,
    firesThinMcqCoverage,
    firesUnresolvedMistakeCluster,
    type TopicGateInput,
} from './phase7PatternGateV1.js';

function topic(partial: Partial<TopicGateInput> & Pick<TopicGateInput, 'topicSlug'>): TopicGateInput {
    return {
        topicId: partial.topicId ?? `id-${partial.topicSlug}`,
        topicName: partial.topicName ?? partial.topicSlug,
        topicSlug: partial.topicSlug,
        status: partial.status ?? TopicStatus.GREEN,
        unresolvedMistakeCount: partial.unresolvedMistakeCount ?? 0,
        revisionMcqCount: partial.revisionMcqCount ?? 5,
        recentCompletedOutcomes: partial.recentCompletedOutcomes ?? [],
        maxIncorrectCountOnAnyQuestion: partial.maxIncorrectCountOnAnyQuestion ?? 0,
    };
}

describe('phase7-pattern-gate-v1', () => {
    it('locks policy version and thresholds', () => {
        assert.equal(PATTERN_GATE_VERSION, 'phase7-pattern-gate-v1');
        assert.equal(PATTERN_GATE_THRESHOLDS.unresolvedMistakeMin, 3);
        assert.equal(PATTERN_GATE_THRESHOLDS.redRepeatCompletedSessions, 2);
        assert.equal(PATTERN_GATE_THRESHOLDS.questionMissMin, 2);
        assert.equal(PATTERN_GATE_THRESHOLDS.thinMcqBelow, 3);
        assert.equal(PATTERN_GATE_THRESHOLDS.presentationCap, 5);
    });

    describe('pg-unresolved-3', () => {
        it('fires at 3+, not at 2', () => {
            assert.equal(firesUnresolvedMistakeCluster(2), false);
            assert.equal(firesUnresolvedMistakeCluster(3), true);
            assert.equal(firesUnresolvedMistakeCluster(4), true);
        });
    });

    describe('pg-red-repeat', () => {
        it('requires two completed red outcomes newest-first', () => {
            assert.equal(firesRepeatedRed([]), false);
            assert.equal(firesRepeatedRed([SchedulingOutcome.RESET]), false);
            assert.equal(
                firesRepeatedRed([SchedulingOutcome.RESET, SchedulingOutcome.REINFORCE_AT_1]),
                true,
            );
            assert.equal(
                firesRepeatedRed([SchedulingOutcome.RESET, SchedulingOutcome.ADVANCE]),
                false,
            );
            assert.equal(
                firesRepeatedRed([
                    SchedulingOutcome.REINFORCE,
                    SchedulingOutcome.RESET,
                    SchedulingOutcome.RESET,
                ]),
                false,
            );
            assert.equal(firesRepeatedRed([null, SchedulingOutcome.RESET]), false);
        });
    });

    describe('pg-question-miss-2', () => {
        it('fires at 2+ incorrect on same question', () => {
            assert.equal(firesRepeatedQuestionMiss(1), false);
            assert.equal(firesRepeatedQuestionMiss(2), true);
        });
    });

    describe('pg-thin-mcq-3', () => {
        it('requires thin bank AND (RED or unresolved>=1)', () => {
            assert.equal(
                firesThinMcqCoverage({
                    revisionMcqCount: 2,
                    status: TopicStatus.GREEN,
                    unresolvedMistakeCount: 0,
                }),
                false,
            );
            assert.equal(
                firesThinMcqCoverage({
                    revisionMcqCount: 2,
                    status: TopicStatus.RED,
                    unresolvedMistakeCount: 0,
                }),
                true,
            );
            assert.equal(
                firesThinMcqCoverage({
                    revisionMcqCount: 2,
                    status: TopicStatus.GREEN,
                    unresolvedMistakeCount: 1,
                }),
                true,
            );
            assert.equal(
                firesThinMcqCoverage({
                    revisionMcqCount: 3,
                    status: TopicStatus.RED,
                    unresolvedMistakeCount: 5,
                }),
                false,
            );
        });
    });

    it('evaluateTopicGates returns severity-ordered unique signals', () => {
        const gates = evaluateTopicGates(
            topic({
                topicSlug: 'closures',
                status: TopicStatus.RED,
                unresolvedMistakeCount: 3,
                revisionMcqCount: 2,
                recentCompletedOutcomes: [
                    SchedulingOutcome.RESET,
                    SchedulingOutcome.REINFORCE_AT_1,
                ],
                maxIncorrectCountOnAnyQuestion: 2,
            }),
        );
        assert.deepEqual(gates, [
            PatternGateSignal.REPEATED_RED,
            PatternGateSignal.UNRESOLVED_MISTAKE_CLUSTER,
            PatternGateSignal.REPEATED_QUESTION_MISS,
            PatternGateSignal.THIN_MCQ_COVERAGE,
        ]);
    });

    it('evaluateTopicGates returns empty when nothing fires', () => {
        assert.deepEqual(
            evaluateTopicGates(
                topic({
                    topicSlug: 'arrays',
                    status: TopicStatus.GREEN,
                    revisionMcqCount: 5,
                }),
            ),
            [],
        );
    });

    it('buildEscalations sorts by severity then slug and caps at 5', () => {
        const items = buildEscalations([
            topic({
                topicSlug: 'zeta-thin',
                status: TopicStatus.RED,
                revisionMcqCount: 1,
            }),
            topic({
                topicSlug: 'alpha-red',
                recentCompletedOutcomes: [
                    SchedulingOutcome.RESET,
                    SchedulingOutcome.RESET,
                ],
            }),
            topic({
                topicSlug: 'beta-miss',
                maxIncorrectCountOnAnyQuestion: 2,
            }),
            topic({
                topicSlug: 'gamma-cluster',
                unresolvedMistakeCount: 3,
            }),
            topic({
                topicSlug: 'delta-thin',
                status: TopicStatus.RED,
                revisionMcqCount: 0,
            }),
            topic({
                topicSlug: 'epsilon-thin',
                unresolvedMistakeCount: 1,
                revisionMcqCount: 1,
            }),
            topic({ topicSlug: 'quiet-green' }),
        ]);

        assert.equal(items.length, 5);
        assert.equal(items[0]!.topicSlug, 'alpha-red');
        assert.deepEqual(items[0]!.gates, [PatternGateSignal.REPEATED_RED]);
        assert.equal(items[1]!.topicSlug, 'gamma-cluster');
        assert.equal(items[2]!.topicSlug, 'beta-miss');
        // Remaining thin topics by slug among delta/epsilon/zeta — cap leaves two
        assert.equal(items[3]!.gates[0], PatternGateSignal.THIN_MCQ_COVERAGE);
        assert.equal(items[4]!.gates[0], PatternGateSignal.THIN_MCQ_COVERAGE);
        assert.ok(!items.some((i) => i.topicSlug === 'quiet-green'));
        assert.ok(!items.some((i) => i.topicSlug === 'zeta-thin'));
    });
});
