// api/_lib/revision/completeSideEffects.ts
// Phase 4 complete-path helpers: Deep Dive ensure + automatic Mistake create.
// Invoked only after a successful OPEN → COMPLETED transition.

import {
    ConfidenceLevel,
    Prisma,
    PrismaClient,
    RevisionSessionOutcome,
    TopicStatus,
} from '../../../generated/prisma/client.js';
import {
    STATUS_POLICY_VERSION,
    mapG5OutcomeToTopicStatus,
} from '../status/index.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export const FALLBACK_CORRECT_UNDERSTANDING =
    'Review the topic materials for the correct understanding.';

export type TopicStatusDto = {
    previous: TopicStatus;
    current: TopicStatus;
    policyVersion: typeof STATUS_POLICY_VERSION;
    reason: string;
    deepDiveEnsured: boolean;
};

export type QualifyingLogRow = {
    id: string;
    questionId: string;
    correct: boolean;
    confidence: ConfidenceLevel;
    explanation: string | null;
};

function isUniqueConflict(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
    );
}

export function deepDiveReasonForOutcome(
    outcome: RevisionSessionOutcome,
): string | null {
    switch (outcome) {
        case RevisionSessionOutcome.RESET:
            return `[${STATUS_POLICY_VERSION}] Session RESET — incorrect answer(s)`;
        case RevisionSessionOutcome.REINFORCE_AT_1:
            return `[${STATUS_POLICY_VERSION}] Session REINFORCE_AT_1 — DIDNT_UNDERSTAND`;
        default:
            return null;
    }
}

export function qualifiesForAutomaticMistake(log: {
    correct: boolean;
    confidence: ConfidenceLevel;
}): boolean {
    if (log.correct === false) {
        return true;
    }
    return (
        log.correct === true &&
        log.confidence === ConfidenceLevel.DIDNT_UNDERSTAND
    );
}

export function automaticMistakeTexts(log: {
    correct: boolean;
    confidence: ConfidenceLevel;
    explanation: string | null;
}): { mistakeText: string; correctUnderstanding: string } {
    const explanation =
        typeof log.explanation === 'string' && log.explanation.trim().length > 0
            ? log.explanation.trim()
            : FALLBACK_CORRECT_UNDERSTANDING;

    if (log.correct === false) {
        return {
            mistakeText: 'Answered incorrectly',
            correctUnderstanding: explanation,
        };
    }

    return {
        mistakeText: 'Marked DIDNT_UNDERSTAND while answered correctly',
        correctUnderstanding: explanation,
    };
}

export function buildTopicStatusDto(
    outcome: RevisionSessionOutcome,
    previousStatus: TopicStatus,
    deepDiveEnsured: boolean,
): TopicStatusDto {
    const mapped = mapG5OutcomeToTopicStatus(outcome, previousStatus);
    return {
        previous: previousStatus,
        current: mapped.status,
        policyVersion: mapped.policyVersion,
        reason: mapped.reason,
        deepDiveEnsured,
    };
}

/**
 * Create-if-missing Deep Dive note for RED outcomes. Never overwrites reason/notes.
 * Returns true only when a row was inserted in this call.
 */
export async function ensureDeepDiveNote(
    tx: DbClient,
    topicId: string,
    outcome: RevisionSessionOutcome,
): Promise<boolean> {
    const reason = deepDiveReasonForOutcome(outcome);
    if (reason === null) {
        return false;
    }

    const existing = await tx.deepDiveNote.findUnique({
        where: { topicId },
        select: { id: true },
    });
    if (existing) {
        return false;
    }

    try {
        await tx.deepDiveNote.create({
            data: {
                topicId,
                reason,
                notes: null,
            },
        });
        return true;
    } catch (error) {
        // Concurrent create-if-missing: unique(topicId) won elsewhere.
        if (isUniqueConflict(error)) {
            return false;
        }
        throw error;
    }
}

/**
 * Insert automatic Mistake rows for qualifying logs.
 * Uses unique sourceSessionLogId + skipDuplicates so retries never overwrite manuals.
 */
export async function createAutomaticMistakes(
    tx: DbClient,
    input: {
        topicId: string;
        sessionId: string;
        logs: QualifyingLogRow[];
    },
): Promise<number> {
    const rows = input.logs
        .filter(qualifiesForAutomaticMistake)
        .map((log) => {
            const texts = automaticMistakeTexts(log);
            return {
                topicId: input.topicId,
                questionId: log.questionId,
                sessionId: input.sessionId,
                sourceSessionLogId: log.id,
                mistakeText: texts.mistakeText,
                correctUnderstanding: texts.correctUnderstanding,
                turnedIntoQuestion: false,
            };
        });

    if (rows.length === 0) {
        return 0;
    }

    const created = await tx.mistake.createMany({
        data: rows,
        skipDuplicates: true,
    });
    return created.count;
}
