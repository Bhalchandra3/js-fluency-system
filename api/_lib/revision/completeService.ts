// api/_lib/revision/completeService.ts
// POST /api/revision/complete — atomic G5 finalize + Topic schedule update.

import {
    ConfidenceLevel,
    Prisma,
    PrismaClient,
    RevisionSessionOutcome,
} from '../../../generated/prisma/client.js';
import {
    aggregateG5SessionOutcome,
    G5_POLICY_VERSION,
    type SchedulingOutcome,
} from '../scheduling/g5Aggregation.js';
import { computeNextRevisionAt } from '../scheduling/calendarDay.js';
import { RevisionApiError } from './errors.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export type CompleteSessionInput = {
    sessionId: unknown;
};

export type CompleteSchedulingDto = {
    outcome: SchedulingOutcome;
    previousIntervalDays: number;
    resultingIntervalDays: number;
    resultingNextRevisionDate: string;
    policyVersion: string;
    reason: string;
};

export type CompleteSessionResponse = {
    status: 'ok';
    sessionStatus: 'COMPLETED';
    scheduling: CompleteSchedulingDto;
};

type LockedSessionRow = {
    id: string;
    status: string;
    topicId: string;
    outcome: RevisionSessionOutcome | null;
    previousIntervalDays: number | null;
    resultingIntervalDays: number | null;
    previousNextRevisionDate: Date | null;
    resultingNextRevisionDate: Date | null;
    policyVersion: string;
    completedAt: Date | null;
};

type LockedTopicRow = {
    id: string;
    intervalDays: number;
    nextRevisionDate: Date;
};

function requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new RevisionApiError(400, `${field} must be a non-empty string`);
    }
    return value;
}

function mapOutcome(outcome: RevisionSessionOutcome): SchedulingOutcome {
    return outcome as SchedulingOutcome;
}

async function buildReasonFromLogs(
    prisma: DbClient,
    sessionId: string,
    previousIntervalDays: number,
): Promise<string> {
    const logs = await prisma.sessionLog.findMany({
        where: { sessionId },
        select: { correct: true, confidence: true },
    });

    const answers = logs.map((log) => {
        if (typeof log.correct !== 'boolean') {
            throw new RevisionApiError(
                500,
                'Stored answer log is missing boolean correct value',
            );
        }
        return {
            correct: log.correct,
            confidence: log.confidence as ConfidenceLevel,
        };
    });

    const aggregated = aggregateG5SessionOutcome(previousIntervalDays, answers);
    return aggregated.reason;
}

async function schedulingFromCompletedAudit(
    client: DbClient,
    session: LockedSessionRow,
): Promise<CompleteSchedulingDto> {
    if (
        session.outcome === null ||
        session.previousIntervalDays === null ||
        session.resultingIntervalDays === null ||
        session.resultingNextRevisionDate === null
    ) {
        throw new RevisionApiError(
            500,
            'Completed session is missing required scheduling audit fields',
        );
    }

    const reason = await buildReasonFromLogs(
        client,
        session.id,
        session.previousIntervalDays,
    );

    return {
        outcome: mapOutcome(session.outcome),
        previousIntervalDays: session.previousIntervalDays,
        resultingIntervalDays: session.resultingIntervalDays,
        resultingNextRevisionDate: session.resultingNextRevisionDate.toISOString(),
        policyVersion: session.policyVersion || G5_POLICY_VERSION,
        reason,
    };
}

/**
 * Finalize an OPEN revision session exactly once.
 * Lock order: RevisionSession → Topic (avoids deadlock with answer path locking session only).
 */
export async function completeRevisionSession(
    prisma: PrismaClient,
    raw: CompleteSessionInput,
    now: Date = new Date(),
): Promise<CompleteSessionResponse> {
    const sessionId = requireNonEmptyString(raw.sessionId, 'sessionId');

    return prisma.$transaction(async (tx) => {
        const lockedSessions = await tx.$queryRaw<LockedSessionRow[]>`
            SELECT
                id,
                status,
                "topicId",
                outcome,
                "previousIntervalDays",
                "resultingIntervalDays",
                "previousNextRevisionDate",
                "resultingNextRevisionDate",
                "policyVersion",
                "completedAt"
            FROM "RevisionSession"
            WHERE id = ${sessionId}
            FOR UPDATE
        `;

        if (lockedSessions.length === 0) {
            throw new RevisionApiError(404, 'Session not found');
        }

        const session = lockedSessions[0]!;

        if (session.status === 'COMPLETED') {
            const scheduling = await schedulingFromCompletedAudit(tx, session);
            return {
                status: 'ok',
                sessionStatus: 'COMPLETED',
                scheduling,
            };
        }

        if (session.status !== 'OPEN') {
            throw new RevisionApiError(409, `Session status is ${session.status}`);
        }

        const frozen = await tx.revisionSessionQuestion.findMany({
            where: { sessionId },
            select: { questionId: true },
            orderBy: { sortOrder: 'asc' },
        });

        if (frozen.length === 0) {
            throw new RevisionApiError(409, 'Session has no frozen questions');
        }

        const logs = await tx.sessionLog.findMany({
            where: { sessionId },
            select: {
                questionId: true,
                correct: true,
                confidence: true,
            },
        });

        const answeredIds = new Set(logs.map((log) => log.questionId));
        const missing = frozen.some((row) => !answeredIds.has(row.questionId));
        if (missing) {
            throw new RevisionApiError(409, 'Session has unanswered questions');
        }

        const answers = logs.map((log) => {
            if (typeof log.correct !== 'boolean') {
                throw new RevisionApiError(
                    500,
                    'Stored answer log is missing boolean correct value',
                );
            }
            return {
                correct: log.correct,
                confidence: log.confidence as ConfidenceLevel,
            };
        });

        const lockedTopics = await tx.$queryRaw<LockedTopicRow[]>`
            SELECT id, "intervalDays", "nextRevisionDate"
            FROM "Topic"
            WHERE id = ${session.topicId}
            FOR UPDATE
        `;
        if (lockedTopics.length === 0) {
            throw new RevisionApiError(500, 'Session topic not found');
        }
        const topic = lockedTopics[0]!;

        let aggregated;
        try {
            aggregated = aggregateG5SessionOutcome(topic.intervalDays, answers);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Invalid scheduling inputs';
            throw new RevisionApiError(500, message);
        }

        const resultingNextRevisionDate = computeNextRevisionAt(
            now,
            aggregated.resultingIntervalDays,
        );

        await tx.topic.update({
            where: { id: topic.id },
            data: {
                intervalDays: aggregated.resultingIntervalDays,
                nextRevisionDate: resultingNextRevisionDate,
            },
        });

        const updated = await tx.revisionSession.updateMany({
            where: { id: sessionId, status: 'OPEN' },
            data: {
                status: 'COMPLETED',
                completedAt: now,
                outcome: aggregated.outcome as RevisionSessionOutcome,
                previousIntervalDays: aggregated.previousIntervalDays,
                resultingIntervalDays: aggregated.resultingIntervalDays,
                previousNextRevisionDate: topic.nextRevisionDate,
                resultingNextRevisionDate,
                policyVersion: aggregated.policyVersion,
            },
        });

        if (updated.count !== 1) {
            // Another completer won; reload stored audit.
            const again = await tx.$queryRaw<LockedSessionRow[]>`
                SELECT
                    id,
                    status,
                    "topicId",
                    outcome,
                    "previousIntervalDays",
                    "resultingIntervalDays",
                    "previousNextRevisionDate",
                    "resultingNextRevisionDate",
                    "policyVersion",
                    "completedAt"
                FROM "RevisionSession"
                WHERE id = ${sessionId}
                FOR UPDATE
            `;
            const winner = again[0];
            if (!winner || winner.status !== 'COMPLETED') {
                throw new RevisionApiError(500, 'Failed to complete revision session');
            }
            const scheduling = await schedulingFromCompletedAudit(tx, winner);
            return {
                status: 'ok',
                sessionStatus: 'COMPLETED',
                scheduling,
            };
        }

        return {
            status: 'ok',
            sessionStatus: 'COMPLETED',
            scheduling: {
                outcome: aggregated.outcome,
                previousIntervalDays: aggregated.previousIntervalDays,
                resultingIntervalDays: aggregated.resultingIntervalDays,
                resultingNextRevisionDate: resultingNextRevisionDate.toISOString(),
                policyVersion: aggregated.policyVersion,
                reason: aggregated.reason,
            },
        };
    });
}
