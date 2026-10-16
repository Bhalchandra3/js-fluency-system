// api/_lib/revision/answerService.ts
// POST /api/revision/answers — evaluate + upsert SessionLog while OPEN.

import {
    ConfidenceLevel,
    PrismaClient,
    QuestionFormat,
    SessionType,
} from '../../../generated/prisma/client.js';
import { RevisionApiError } from './errors.js';
import { computeSessionProgress } from './sessionProgress.js';

export type SubmitAnswerInput = {
    sessionId: unknown;
    questionId: unknown;
    selectedAnswer: unknown;
    confidence: unknown;
    selfAssessedCorrect?: unknown;
};

export type SubmitAnswerResponse = {
    status: 'ok';
    correct: boolean;
    correctAnswer?: string;
    explanation?: string;
    progress: { answered: number; total: number };
    sessionStatus: 'OPEN';
    canComplete: boolean;
};

const CONFIDENCE_VALUES = new Set<string>(Object.values(ConfidenceLevel));

type LockedSessionRow = {
    id: string;
    status: string;
    topicId: string;
};

function requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new RevisionApiError(400, `${field} must be a non-empty string`);
    }
    return value;
}

function parseConfidence(value: unknown): ConfidenceLevel {
    if (typeof value !== 'string' || !CONFIDENCE_VALUES.has(value)) {
        throw new RevisionApiError(
            400,
            `confidence must be one of ${[...CONFIDENCE_VALUES].join(', ')}`,
        );
    }
    return value as ConfidenceLevel;
}

function parseOptions(options: unknown): string[] | null {
    if (options === null || options === undefined) {
        return null;
    }
    if (!Array.isArray(options) || !options.every((item) => typeof item === 'string')) {
        return null;
    }
    return options as string[];
}

function evaluateAnswer(input: {
    format: QuestionFormat;
    selectedAnswer: string;
    correctAnswer: string | null;
    options: unknown;
    selfAssessedCorrect: unknown;
    selfAssessedPresent: boolean;
}): { correct: boolean } {
    if (input.format === QuestionFormat.MULTIPLE_CHOICE) {
        if (input.selfAssessedPresent) {
            throw new RevisionApiError(
                400,
                'selfAssessedCorrect is not allowed for MULTIPLE_CHOICE',
            );
        }

        const options = parseOptions(input.options);
        if (!options || options.length === 0) {
            throw new RevisionApiError(400, 'MULTIPLE_CHOICE question has invalid options');
        }
        if (input.correctAnswer === null || input.correctAnswer === undefined) {
            throw new RevisionApiError(500, 'MULTIPLE_CHOICE question is missing correctAnswer');
        }

        const index = Number(input.selectedAnswer);
        if (
            !Number.isInteger(index) ||
            String(index) !== input.selectedAnswer ||
            index < 0 ||
            index >= options.length
        ) {
            throw new RevisionApiError(
                400,
                `selectedAnswer must be a valid option index string (0..${options.length - 1})`,
            );
        }

        return { correct: input.selectedAnswer === input.correctAnswer };
    }

    if (input.format === QuestionFormat.SHORT_ANSWER) {
        if (typeof input.selfAssessedCorrect !== 'boolean') {
            throw new RevisionApiError(
                400,
                'selfAssessedCorrect boolean is required for SHORT_ANSWER',
            );
        }
        return { correct: input.selfAssessedCorrect };
    }

    throw new RevisionApiError(
        400,
        `Unsupported question format for revision answers: ${input.format}`,
    );
}

/**
 * Submit one answer for an OPEN revision session.
 * Locks the session row so completion cannot race past an OPEN check.
 */
export async function submitRevisionAnswer(
    prisma: PrismaClient,
    raw: SubmitAnswerInput,
    now: Date = new Date(),
): Promise<SubmitAnswerResponse> {
    const sessionId = requireNonEmptyString(raw.sessionId, 'sessionId');
    const questionId = requireNonEmptyString(raw.questionId, 'questionId');
    const selectedAnswer = requireNonEmptyString(raw.selectedAnswer, 'selectedAnswer');
    const confidence = parseConfidence(raw.confidence);
    const selfAssessedPresent = Object.prototype.hasOwnProperty.call(
        raw,
        'selfAssessedCorrect',
    );

    return prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<LockedSessionRow[]>`
            SELECT id, status, "topicId"
            FROM "RevisionSession"
            WHERE id = ${sessionId}
            FOR UPDATE
        `;

        if (locked.length === 0) {
            throw new RevisionApiError(404, 'Session not found');
        }

        const session = locked[0]!;
        if (session.status === 'COMPLETED') {
            throw new RevisionApiError(409, 'Session is already completed');
        }
        if (session.status !== 'OPEN') {
            throw new RevisionApiError(409, `Session status is ${session.status}`);
        }

        const association = await tx.revisionSessionQuestion.findUnique({
            where: {
                sessionId_questionId: { sessionId, questionId },
            },
            select: { questionId: true },
        });
        if (!association) {
            throw new RevisionApiError(409, 'Question is not in this session');
        }

        const question = await tx.question.findUnique({
            where: { id: questionId },
            select: {
                id: true,
                topicId: true,
                format: true,
                options: true,
                correctAnswer: true,
                explanation: true,
            },
        });
        if (!question) {
            throw new RevisionApiError(404, 'Question not found');
        }
        if (question.topicId !== session.topicId) {
            throw new RevisionApiError(409, 'Question topic does not match session topic');
        }

        const { correct } = evaluateAnswer({
            format: question.format,
            selectedAnswer,
            correctAnswer: question.correctAnswer,
            options: question.options,
            selfAssessedCorrect: raw.selfAssessedCorrect,
            selfAssessedPresent,
        });

        await tx.sessionLog.upsert({
            where: {
                sessionId_questionId: { sessionId, questionId },
            },
            create: {
                topicId: session.topicId,
                questionId,
                sessionId,
                sessionType: SessionType.REVISION,
                selectedAnswer,
                correct,
                confidence,
                answeredAt: now,
            },
            update: {
                selectedAnswer,
                correct,
                confidence,
                answeredAt: now,
                sessionType: SessionType.REVISION,
                topicId: session.topicId,
            },
        });

        const frozen = await tx.revisionSessionQuestion.findMany({
            where: { sessionId },
            select: { questionId: true },
        });
        const logs = await tx.sessionLog.findMany({
            where: { sessionId },
            select: { questionId: true },
        });

        const progress = computeSessionProgress(
            frozen.map((row) => row.questionId),
            logs.map((row) => row.questionId),
        );

        const response: SubmitAnswerResponse = {
            status: 'ok',
            correct,
            progress: {
                answered: progress.answered,
                total: progress.total,
            },
            sessionStatus: 'OPEN',
            canComplete: progress.canComplete,
        };

        if (question.correctAnswer !== null && question.correctAnswer !== undefined) {
            response.correctAnswer = question.correctAnswer;
        }
        if (question.explanation) {
            response.explanation = question.explanation;
        }

        return response;
    });
}
