// api/_lib/revision/completeSideEffects.test.ts
// Pure helpers for Phase 4 complete-path side effects (no DB).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfidenceLevel, RevisionSessionOutcome, TopicStatus } from '../../../generated/prisma/enums.js';
import {
    FALLBACK_CORRECT_UNDERSTANDING,
    automaticMistakeTexts,
    buildTopicStatusDto,
    deepDiveReasonForOutcome,
    qualifiesForAutomaticMistake,
} from './completeSideEffects.js';

describe('completeSideEffects helpers', () => {
    describe('qualifiesForAutomaticMistake', () => {
        for (const confidence of Object.values(ConfidenceLevel)) {
            it(`incorrect + ${confidence} qualifies`, () => {
                assert.equal(
                    qualifiesForAutomaticMistake({
                        correct: false,
                        confidence,
                    }),
                    true,
                );
            });
        }

        it('correct + DIDNT_UNDERSTAND qualifies', () => {
            assert.equal(
                qualifiesForAutomaticMistake({
                    correct: true,
                    confidence: ConfidenceLevel.DIDNT_UNDERSTAND,
                }),
                true,
            );
        });

        it('correct + DIFFICULT does not qualify', () => {
            assert.equal(
                qualifiesForAutomaticMistake({
                    correct: true,
                    confidence: ConfidenceLevel.DIFFICULT,
                }),
                false,
            );
        });

        it('correct + EASY / OKAY do not qualify', () => {
            assert.equal(
                qualifiesForAutomaticMistake({
                    correct: true,
                    confidence: ConfidenceLevel.EASY,
                }),
                false,
            );
            assert.equal(
                qualifiesForAutomaticMistake({
                    correct: true,
                    confidence: ConfidenceLevel.OKAY,
                }),
                false,
            );
        });
    });

    describe('automaticMistakeTexts', () => {
        it('incorrect prefers non-empty explanation', () => {
            const texts = automaticMistakeTexts({
                correct: false,
                confidence: ConfidenceLevel.EASY,
                explanation: '  because-closures  ',
            });
            assert.equal(texts.mistakeText, 'Answered incorrectly');
            assert.equal(texts.correctUnderstanding, 'because-closures');
        });

        it('incorrect falls back when explanation empty', () => {
            const texts = automaticMistakeTexts({
                correct: false,
                confidence: ConfidenceLevel.OKAY,
                explanation: '   ',
            });
            assert.equal(texts.correctUnderstanding, FALLBACK_CORRECT_UNDERSTANDING);
        });

        it('DIDNT_UNDERSTAND correct uses locked template', () => {
            const texts = automaticMistakeTexts({
                correct: true,
                confidence: ConfidenceLevel.DIDNT_UNDERSTAND,
                explanation: null,
            });
            assert.equal(
                texts.mistakeText,
                'Marked DIDNT_UNDERSTAND while answered correctly',
            );
            assert.equal(texts.correctUnderstanding, FALLBACK_CORRECT_UNDERSTANDING);
        });
    });

    describe('deepDiveReasonForOutcome', () => {
        it('RESET and REINFORCE_AT_1 return phase4-status-v1 reasons', () => {
            assert.match(
                deepDiveReasonForOutcome(RevisionSessionOutcome.RESET)!,
                /^\[phase4-status-v1\] Session RESET/,
            );
            assert.match(
                deepDiveReasonForOutcome(RevisionSessionOutcome.REINFORCE_AT_1)!,
                /^\[phase4-status-v1\] Session REINFORCE_AT_1/,
            );
        });

        it('non-Red outcomes return null', () => {
            assert.equal(
                deepDiveReasonForOutcome(RevisionSessionOutcome.ADVANCE),
                null,
            );
            assert.equal(
                deepDiveReasonForOutcome(RevisionSessionOutcome.REINFORCE),
                null,
            );
        });
    });

    describe('buildTopicStatusDto', () => {
        it('maps each G5 outcome to expected status', () => {
            assert.equal(
                buildTopicStatusDto(
                    RevisionSessionOutcome.ADVANCE,
                    TopicStatus.RED,
                    false,
                ).current,
                TopicStatus.GREEN,
            );
            assert.equal(
                buildTopicStatusDto(
                    RevisionSessionOutcome.REINFORCE,
                    TopicStatus.RED,
                    false,
                ).current,
                TopicStatus.YELLOW,
            );
            assert.equal(
                buildTopicStatusDto(
                    RevisionSessionOutcome.REINFORCE_AT_1,
                    TopicStatus.GREEN,
                    true,
                ).current,
                TopicStatus.RED,
            );
            assert.equal(
                buildTopicStatusDto(
                    RevisionSessionOutcome.RESET,
                    TopicStatus.YELLOW,
                    true,
                ).current,
                TopicStatus.RED,
            );
        });

        it('preserves previous and deepDiveEnsured flag', () => {
            const dto = buildTopicStatusDto(
                RevisionSessionOutcome.ADVANCE,
                TopicStatus.YELLOW,
                false,
            );
            assert.equal(dto.previous, TopicStatus.YELLOW);
            assert.equal(dto.current, TopicStatus.GREEN);
            assert.equal(dto.policyVersion, 'phase4-status-v1');
            assert.equal(dto.deepDiveEnsured, false);
            assert.match(dto.reason, /was YELLOW/);
        });
    });
});
