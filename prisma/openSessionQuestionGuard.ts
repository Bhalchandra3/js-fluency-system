// prisma/openSessionQuestionGuard.ts
// Narrow safeguard: block content updates for questions frozen into an OPEN revision session.

import type { PrismaClient } from '../generated/prisma/client.js';

export type OpenSessionQuestionRef = {
    questionId: string;
    sessionId: string;
};

/**
 * Returns the first OPEN RevisionSession that references the question, if any.
 */
export async function findOpenSessionReferencingQuestion(
    prisma: PrismaClient,
    questionId: string,
): Promise<OpenSessionQuestionRef | null> {
    const row = await prisma.revisionSessionQuestion.findFirst({
        where: {
            questionId,
            session: {
                status: 'OPEN',
            },
        },
        select: {
            questionId: true,
            sessionId: true,
        },
    });

    return row;
}

export function formatOpenSessionQuestionMutationError(
    ref: OpenSessionQuestionRef,
    contextLabel: string,
): Error {
    return new Error(
        `${contextLabel}: cannot update question id=${ref.questionId} while it is referenced by OPEN revision session id=${ref.sessionId}. Complete or abandon that session before reseeding this question's content.`,
    );
}

/**
 * Throws if the question belongs to any OPEN revision session.
 * Call before mutating learner-facing question content.
 */
export async function assertQuestionNotInOpenRevisionSession(
    prisma: PrismaClient,
    questionId: string,
    contextLabel: string,
): Promise<void> {
    const ref = await findOpenSessionReferencingQuestion(prisma, questionId);
    if (ref) {
        throw formatOpenSessionQuestionMutationError(ref, contextLabel);
    }
}
