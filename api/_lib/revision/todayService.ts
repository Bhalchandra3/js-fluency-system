// api/_lib/revision/todayService.ts
// Today's Revision read: due classification, sticky OPEN resume, freeze-on-create.

import {
    Prisma,
    PrismaClient,
    QuestionFormat,
    SessionType,
} from '../../../generated/prisma/client.js';
import {
    compareRevisionPriority,
    isRevisionDue,
    isRevisionOverdue,
} from '../scheduling/index.js';

export type TodayQuestionDto = {
    id: string;
    format: QuestionFormat;
    prompt: string;
    options?: unknown;
    codeSnippet?: string | null;
};

export type TodaySessionDto = {
    id: string;
    status: 'OPEN';
    topic: {
        id: string;
        name: string;
        slug: string;
        intervalDays: number;
        nextRevisionDate: string;
        isOverdue: boolean;
    };
    questions: TodayQuestionDto[];
    progress: { answered: number; total: number };
    canComplete: boolean;
};

export type TodayRevisionResponse = {
    status: 'ok';
    dueCount: number;
    overdueCount: number;
    session: TodaySessionDto | null;
};

type TopicRow = {
    id: string;
    name: string;
    slug: string;
    intervalDays: number;
    nextRevisionDate: Date;
};

type SessionLoad = {
    id: string;
    topicId: string;
    topic: TopicRow;
    questions: Array<{
        sortOrder: number;
        question: {
            id: string;
            format: QuestionFormat;
            prompt: string;
            options: unknown;
            codeSnippet: string | null;
        };
    }>;
    logs: Array<{ questionId: string }>;
};

const questionSelect = {
    id: true,
    format: true,
    prompt: true,
    options: true,
    codeSnippet: true,
} as const;

const sessionInclude = {
    topic: {
        select: {
            id: true,
            name: true,
            slug: true,
            intervalDays: true,
            nextRevisionDate: true,
        },
    },
    questions: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
            sortOrder: true,
            question: { select: questionSelect },
        },
    },
    logs: {
        select: { questionId: true },
    },
};

function isUniqueConflict(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
    );
}

function mapQuestion(question: {
    id: string;
    format: QuestionFormat;
    prompt: string;
    options: unknown;
    codeSnippet: string | null;
}): TodayQuestionDto {
    const dto: TodayQuestionDto = {
        id: question.id,
        format: question.format,
        prompt: question.prompt,
    };

    if (question.options !== null && question.options !== undefined) {
        dto.options = question.options;
    }

    if (question.codeSnippet !== null && question.codeSnippet !== undefined) {
        dto.codeSnippet = question.codeSnippet;
    }

    return dto;
}

function mapSession(session: SessionLoad, now: Date): TodaySessionDto {
    const frozenIds = new Set(session.questions.map((row) => row.question.id));
    const answered = session.logs.filter((log) => frozenIds.has(log.questionId)).length;
    const total = session.questions.length;

    return {
        id: session.id,
        status: 'OPEN',
        topic: {
            id: session.topic.id,
            name: session.topic.name,
            slug: session.topic.slug,
            intervalDays: session.topic.intervalDays,
            nextRevisionDate: session.topic.nextRevisionDate.toISOString(),
            isOverdue: isRevisionOverdue(session.topic.nextRevisionDate, now),
        },
        questions: session.questions.map((row) => mapQuestion(row.question)),
        progress: { answered, total },
        canComplete: total > 0 && answered === total,
    };
}

async function loadOpenSession(
    prisma: PrismaClient,
    sessionId: string,
): Promise<SessionLoad | null> {
    return prisma.revisionSession.findFirst({
        where: { id: sessionId, status: 'OPEN' },
        include: sessionInclude,
    });
}

async function loadOpenSessionForTopic(
    prisma: PrismaClient,
    topicId: string,
): Promise<SessionLoad | null> {
    return prisma.revisionSession.findFirst({
        where: { topicId, status: 'OPEN' },
        include: sessionInclude,
    });
}

async function loadRevisionQuestions(prisma: PrismaClient, topicId: string) {
    return prisma.question.findMany({
        where: { topicId, sessionType: SessionType.REVISION },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, createdAt: true },
    });
}

/**
 * If an OPEN session exists with zero associations (rare race), attach the
 * current REVISION bank once. Never overwrite a nonempty frozen set.
 */
async function ensureAssociationsIfEmpty(
    prisma: PrismaClient,
    session: SessionLoad,
): Promise<SessionLoad> {
    if (session.questions.length > 0) {
        return session;
    }

    const bank = await loadRevisionQuestions(prisma, session.topicId);
    if (bank.length === 0) {
        return session;
    }

    try {
        await prisma.$transaction(async (tx) => {
            const locked = await tx.revisionSession.findFirst({
                where: { id: session.id, status: 'OPEN' },
                include: { questions: { select: { id: true } } },
            });
            if (!locked || locked.questions.length > 0) {
                return;
            }

            await tx.revisionSessionQuestion.createMany({
                data: bank.map((question, index) => ({
                    sessionId: session.id,
                    questionId: question.id,
                    sortOrder: index,
                })),
            });
        });
    } catch (error) {
        if (!isUniqueConflict(error)) {
            throw error;
        }
    }

    const reloaded = await loadOpenSession(prisma, session.id);
    return reloaded ?? session;
}

async function createOpenSessionWithQuestions(
    prisma: PrismaClient,
    topicId: string,
    questionIds: string[],
): Promise<SessionLoad> {
    try {
        const created = await prisma.revisionSession.create({
            data: {
                topicId,
                status: 'OPEN',
                questions: {
                    create: questionIds.map((questionId, index) => ({
                        questionId,
                        sortOrder: index,
                    })),
                },
            },
            include: sessionInclude,
        });
        return created;
    } catch (error) {
        if (!isUniqueConflict(error)) {
            throw error;
        }

        const existing = await loadOpenSessionForTopic(prisma, topicId);
        if (!existing) {
            throw error;
        }

        return ensureAssociationsIfEmpty(prisma, existing);
    }
}

/**
 * Build the GET /api/revision/today payload for a single consistent `now`.
 */
export async function getTodayRevision(
    prisma: PrismaClient,
    now: Date = new Date(),
): Promise<TodayRevisionResponse> {
    const topics = await prisma.topic.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            intervalDays: true,
            nextRevisionDate: true,
        },
    });

    const dueTopics = topics
        .filter((topic) => isRevisionDue(topic.nextRevisionDate, now))
        .sort((a, b) =>
            compareRevisionPriority(
                {
                    nextRevisionAt: a.nextRevisionDate,
                    name: a.name,
                    id: a.id,
                },
                {
                    nextRevisionAt: b.nextRevisionDate,
                    name: b.name,
                    id: b.id,
                },
                now,
            ),
        );

    const dueCount = dueTopics.length;
    const overdueCount = dueTopics.filter((topic) =>
        isRevisionOverdue(topic.nextRevisionDate, now),
    ).length;

    if (dueCount === 0) {
        return { status: 'ok', dueCount: 0, overdueCount: 0, session: null };
    }

    const dueTopicIds = dueTopics.map((topic) => topic.id);
    const openSessions = await prisma.revisionSession.findMany({
        where: {
            status: 'OPEN',
            topicId: { in: dueTopicIds },
        },
        include: sessionInclude,
    });

    if (openSessions.length > 0) {
        const byTopicId = new Map(dueTopics.map((topic) => [topic.id, topic]));
        openSessions.sort((a, b) => {
            const topicA = byTopicId.get(a.topicId) ?? a.topic;
            const topicB = byTopicId.get(b.topicId) ?? b.topic;
            return compareRevisionPriority(
                {
                    nextRevisionAt: topicA.nextRevisionDate,
                    name: topicA.name,
                    id: topicA.id,
                },
                {
                    nextRevisionAt: topicB.nextRevisionDate,
                    name: topicB.name,
                    id: topicB.id,
                },
                now,
            );
        });

        const sticky = await ensureAssociationsIfEmpty(prisma, openSessions[0]!);
        if (sticky.questions.length > 0) {
            return {
                status: 'ok',
                dueCount,
                overdueCount,
                session: mapSession(sticky, now),
            };
        }
        // Empty OPEN (no associations and no bank to backfill): skip sticky; try create path.
    }

    for (const topic of dueTopics) {
        const existing = await loadOpenSessionForTopic(prisma, topic.id);
        if (existing) {
            const ready = await ensureAssociationsIfEmpty(prisma, existing);
            if (ready.questions.length > 0) {
                return {
                    status: 'ok',
                    dueCount,
                    overdueCount,
                    session: mapSession(ready, now),
                };
            }
            continue;
        }

        const bank = await loadRevisionQuestions(prisma, topic.id);
        if (bank.length === 0) {
            continue;
        }

        const created = await createOpenSessionWithQuestions(
            prisma,
            topic.id,
            bank.map((question) => question.id),
        );

        if (created.questions.length === 0) {
            continue;
        }

        return {
            status: 'ok',
            dueCount,
            overdueCount,
            session: mapSession(created, now),
        };
    }

    return {
        status: 'ok',
        dueCount,
        overdueCount,
        session: null,
    };
}
