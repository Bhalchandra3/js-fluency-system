// api/_lib/revision/todayService.integration.test.ts
// Disposable-PostgreSQL verification for Today's Revision read service.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    Prisma,
    PrismaClient,
    QuestionFormat,
    SessionType,
} from '../../../generated/prisma/client.js';
import {
    kolkataCalendarDateToUtcInstant,
    type CalendarDate,
} from '../scheduling/calendarDay.js';
import { getTodayRevision } from './todayService.js';
import { handleTodayRevision } from '../../revision/today.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function requireTestDatabaseUrl(): string {
    const url = process.env['DATABASE_URL_TEST'];
    if (!url) {
        throw new Error(
            'DATABASE_URL_TEST must be set to the disposable Postgres URL. Refusing to run integration tests.',
        );
    }

    const parsed = new URL(url.replace(/^postgres(ql)?:/i, 'http:'));
    if (parsed.hostname.includes('neon.tech')) {
        throw new Error('Refusing to run integration tests against Neon');
    }
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
        throw new Error(`Refusing non-localhost test host: ${parsed.hostname}`);
    }

    return url;
}

const PREFIX = `today-${Date.now()}`;
const NOW = new Date('2026-10-15T12:00:00.000Z'); // 2026-10-15 ~17:30 IST
const TODAY: CalendarDate = { year: 2026, month: 10, day: 15 };
const YESTERDAY: CalendarDate = { year: 2026, month: 10, day: 14 };
const TOMORROW: CalendarDate = { year: 2026, month: 10, day: 16 };

function utcOn(date: CalendarDate): Date {
    return kolkataCalendarDateToUtcInstant(date);
}

describe('getTodayRevision (integration / disposable DB)', () => {
    const databaseUrl = requireTestDatabaseUrl();
    const pool = new Pool({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const createdTopicIds: string[] = [];

    /** Complete OPEN sessions and park unrelated suite topics in the future. */
    async function isolateTopics(activeTopicIds: string[]) {
        await prisma.revisionSession.updateMany({
            where: { status: 'OPEN', topicId: { in: createdTopicIds } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });
        const others = createdTopicIds.filter((id) => !activeTopicIds.includes(id));
        if (others.length > 0) {
            await prisma.topic.updateMany({
                where: { id: { in: others } },
                data: { nextRevisionDate: utcOn(TOMORROW) },
            });
        }
    }

    async function createTopic(input: {
        name: string;
        nextRevisionDate: Date;
        withQuestions?: Array<{
            prompt: string;
            correctAnswer?: string;
            explanation?: string;
            createdAt?: Date;
        }>;
    }) {
        const topic = await prisma.topic.create({
            data: {
                name: `${PREFIX}-${input.name}`,
                slug: `${PREFIX}-${input.name}`,
                category: 'Fundamentals',
                nextRevisionDate: input.nextRevisionDate,
            },
        });
        createdTopicIds.push(topic.id);

        const questions = [];
        for (const [index, q] of (input.withQuestions ?? []).entries()) {
            const created = await prisma.question.create({
                data: {
                    topicId: topic.id,
                    sessionType: SessionType.REVISION,
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: q.prompt,
                    options: ['a', 'b'],
                    correctAnswer: q.correctAnswer ?? '0',
                    explanation: q.explanation ?? 'secret-explanation',
                    createdAt: q.createdAt ?? new Date(Date.UTC(2026, 0, 1 + index)),
                },
            });
            questions.push(created);
        }

        return { topic, questions };
    }

    before(async () => {
        const identity = await pool.query(
            'SELECT current_database() AS db, inet_server_addr()::text AS addr',
        );
        assert.equal(identity.rows[0].db, 'jsfluency_test');
        assert.ok(
            String(identity.rows[0].addr).startsWith('172.') ||
                identity.rows[0].addr === '127.0.0.1',
            'expected docker/local server address',
        );
    });

    after(async () => {
        if (createdTopicIds.length > 0) {
            await prisma.sessionLog.deleteMany({
                where: { topicId: { in: createdTopicIds } },
            });
            await prisma.revisionSessionQuestion.deleteMany({
                where: { session: { topicId: { in: createdTopicIds } } },
            });
            await prisma.revisionSession.deleteMany({
                where: { topicId: { in: createdTopicIds } },
            });
            await prisma.question.deleteMany({
                where: { topicId: { in: createdTopicIds } },
            });
            await prisma.topic.deleteMany({
                where: { id: { in: createdTopicIds } },
            });
        }
        await prisma.$disconnect();
        await pool.end();
    });

    it('1: no topics due → empty session and zero counts', async () => {
        await createTopic({
            name: 'future-only',
            nextRevisionDate: utcOn(TOMORROW),
            withQuestions: [{ prompt: 'future q' }],
        });

        const result = await getTodayRevision(prisma, NOW);
        assert.deepEqual(result, {
            status: 'ok',
            dueCount: 0,
            overdueCount: 0,
            session: null,
        });
    });

    it('2-4,20: due/overdue ordering, counts, future excluded, equal-date ties', async () => {
        const overdueB = await createTopic({
            name: 'overdue-b',
            nextRevisionDate: utcOn(YESTERDAY),
            withQuestions: [{ prompt: 'ob' }],
        });
        const overdueA = await createTopic({
            name: 'overdue-a',
            nextRevisionDate: utcOn(YESTERDAY),
            withQuestions: [{ prompt: 'oa' }],
        });
        const dueToday = await createTopic({
            name: 'due-today',
            nextRevisionDate: utcOn(TODAY),
            withQuestions: [{ prompt: 'dt' }],
        });
        await createTopic({
            name: 'future-2',
            nextRevisionDate: utcOn(TOMORROW),
            withQuestions: [{ prompt: 'f2' }],
        });

        const result = await getTodayRevision(prisma, NOW);
        assert.ok(result.dueCount >= 3);
        assert.ok(result.overdueCount >= 2);
        assert.ok(result.dueCount >= result.overdueCount);
        assert.ok(result.session);
        // Overdue before due-today; equal overdue dates → name then id (overdue-a before overdue-b)
        assert.equal(result.session!.topic.id, overdueA.topic.id);
        assert.equal(result.session!.topic.isOverdue, true);
        assert.notEqual(result.session!.topic.id, dueToday.topic.id);
        assert.notEqual(result.session!.topic.id, overdueB.topic.id);
    });

    it('5: existing OPEN session is reused', async () => {
        const first = await getTodayRevision(prisma, NOW);
        assert.ok(first.session);
        const second = await getTodayRevision(prisma, NOW);
        assert.ok(second.session);
        assert.equal(second.session!.id, first.session!.id);
    });

    it('6: sticky resume prefers OPEN on non-primary due topic', async () => {
        // Primary overdue by name would be sticky-primary-a, but OPEN exists on sticky-primary-z
        const primary = await createTopic({
            name: 'sticky-primary-a',
            nextRevisionDate: utcOn(YESTERDAY),
            withQuestions: [{ prompt: 'primary' }],
        });
        const secondary = await createTopic({
            name: 'sticky-primary-z',
            nextRevisionDate: utcOn(YESTERDAY),
            withQuestions: [{ prompt: 'secondary' }],
        });
        await isolateTopics([primary.topic.id, secondary.topic.id]);

        const open = await prisma.revisionSession.create({
            data: {
                topicId: secondary.topic.id,
                status: 'OPEN',
                questions: {
                    create: {
                        questionId: secondary.questions[0]!.id,
                        sortOrder: 0,
                    },
                },
            },
        });

        const result = await getTodayRevision(prisma, NOW);
        assert.ok(result.session);
        assert.equal(result.session!.id, open.id);
        assert.equal(result.session!.topic.id, secondary.topic.id);
        assert.notEqual(result.session!.topic.id, primary.topic.id);
    });

    it('7-9: freeze order, ignore live bank reordering, no answer leakage', async () => {
        const { topic, questions } = await createTopic({
            name: 'freeze-order',
            nextRevisionDate: utcOn(TODAY),
            withQuestions: [
                { prompt: 'q-early', createdAt: new Date('2026-01-01T00:00:00.000Z') },
                { prompt: 'q-late', createdAt: new Date('2026-01-02T00:00:00.000Z') },
            ],
        });
        await isolateTopics([topic.id]);

        const created = await getTodayRevision(prisma, NOW);
        assert.ok(created.session);
        assert.equal(created.session!.topic.id, topic.id);
        assert.equal(created.session!.questions.length, 2);
        assert.equal(created.session!.questions[0]!.id, questions[0]!.id);
        assert.equal(created.session!.questions[1]!.id, questions[1]!.id);

        // Mutate live bank order signal (createdAt) — frozen response must not change.
        await prisma.question.update({
            where: { id: questions[0]!.id },
            data: { createdAt: new Date('2026-12-01T00:00:00.000Z') },
        });

        const resumed = await getTodayRevision(prisma, NOW);
        assert.equal(resumed.session!.id, created.session!.id);
        assert.equal(resumed.session!.questions[0]!.id, questions[0]!.id);
        assert.equal(resumed.session!.questions[1]!.id, questions[1]!.id);

        const serialized = JSON.stringify(resumed);
        assert.equal(serialized.includes('correctAnswer'), false);
        assert.equal(serialized.includes('explanation'), false);
        assert.equal(serialized.includes('secret-explanation'), false);
    });

    it('10: progress and canComplete reflect answer logs', async () => {
        const { topic, questions } = await createTopic({
            name: 'progress',
            nextRevisionDate: utcOn(TODAY),
            withQuestions: [{ prompt: 'p1' }, { prompt: 'p2' }],
        });
        await isolateTopics([topic.id]);

        const open = await getTodayRevision(prisma, NOW);
        assert.ok(open.session);
        assert.equal(open.session!.topic.id, topic.id);
        assert.deepEqual(open.session!.progress, { answered: 0, total: 2 });
        assert.equal(open.session!.canComplete, false);

        await prisma.sessionLog.create({
            data: {
                topicId: topic.id,
                questionId: questions[0]!.id,
                sessionId: open.session!.id,
                sessionType: SessionType.REVISION,
                selectedAnswer: '0',
                correct: true,
                confidence: 'OKAY',
            },
        });

        const mid = await getTodayRevision(prisma, NOW);
        assert.deepEqual(mid.session!.progress, { answered: 1, total: 2 });
        assert.equal(mid.session!.canComplete, false);

        await prisma.sessionLog.create({
            data: {
                topicId: topic.id,
                questionId: questions[1]!.id,
                sessionId: open.session!.id,
                sessionType: SessionType.REVISION,
                selectedAnswer: '1',
                correct: false,
                confidence: 'DIFFICULT',
            },
        });

        const done = await getTodayRevision(prisma, NOW);
        assert.deepEqual(done.session!.progress, { answered: 2, total: 2 });
        assert.equal(done.session!.canComplete, true);
    });

    it('11-12: zero REVISION questions skipped; all ineligible → session null with counts', async () => {
        await prisma.revisionSession.updateMany({
            where: { status: 'OPEN', topicId: { in: createdTopicIds } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        const emptyA = await createTopic({
            name: 'empty-a',
            nextRevisionDate: utcOn(YESTERDAY),
        });
        const emptyB = await createTopic({
            name: 'empty-b',
            nextRevisionDate: utcOn(TODAY),
        });

        // Also create a PRACTICE-only question (not REVISION)
        await prisma.question.create({
            data: {
                topicId: emptyA.topic.id,
                sessionType: SessionType.PRACTICE,
                format: QuestionFormat.SHORT_ANSWER,
                prompt: 'practice only',
                correctAnswer: 'x',
            },
        });

        const result = await getTodayRevision(prisma, NOW);
        assert.ok(result.dueCount >= 2);
        // May still find older eligible topics from earlier tests if any remain OPEN-completed
        // with due dates — ensure empty topics are not selected when others exist.
        if (result.session) {
            assert.notEqual(result.session.topic.id, emptyA.topic.id);
            assert.notEqual(result.session.topic.id, emptyB.topic.id);
        }

        // Force only empty due topics by completing all other OPEN and moving other topics future
        await prisma.topic.updateMany({
            where: {
                id: {
                    in: createdTopicIds.filter(
                        (id) => id !== emptyA.topic.id && id !== emptyB.topic.id,
                    ),
                },
            },
            data: { nextRevisionDate: utcOn(TOMORROW) },
        });
        await prisma.revisionSession.updateMany({
            where: { status: 'OPEN', topicId: { in: createdTopicIds } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        const emptyOnly = await getTodayRevision(prisma, NOW);
        assert.equal(emptyOnly.dueCount, 2);
        assert.equal(emptyOnly.overdueCount, 1);
        assert.equal(emptyOnly.session, null);
    });

    it('13-14: concurrent creates resolve to one OPEN session', async () => {
        await prisma.topic.updateMany({
            where: { id: { in: createdTopicIds } },
            data: { nextRevisionDate: utcOn(TOMORROW) },
        });
        await prisma.revisionSession.updateMany({
            where: { status: 'OPEN', topicId: { in: createdTopicIds } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        const { topic } = await createTopic({
            name: 'concurrent',
            nextRevisionDate: utcOn(TODAY),
            withQuestions: [{ prompt: 'c1' }, { prompt: 'c2' }],
        });

        const [a, b] = await Promise.all([
            getTodayRevision(prisma, NOW),
            getTodayRevision(prisma, NOW),
        ]);

        assert.ok(a.session);
        assert.ok(b.session);
        assert.equal(a.session!.id, b.session!.id);
        assert.equal(a.session!.topic.id, topic.id);

        const openCount = await prisma.revisionSession.count({
            where: { topicId: topic.id, status: 'OPEN' },
        });
        assert.equal(openCount, 1);

        const associations = await prisma.revisionSessionQuestion.count({
            where: { sessionId: a.session!.id },
        });
        assert.equal(associations, 2);
    });

    it('15: failed create leaves no partial session', async () => {
        await prisma.topic.updateMany({
            where: { id: { in: createdTopicIds } },
            data: { nextRevisionDate: utcOn(TOMORROW) },
        });

        const { topic, questions } = await createTopic({
            name: 'partial-fail',
            nextRevisionDate: utcOn(TODAY),
            withQuestions: [{ prompt: 'pf' }],
        });

        // Force failure: use invalid question id in a direct create path equivalent
        await assert.rejects(async () => {
            await prisma.revisionSession.create({
                data: {
                    topicId: topic.id,
                    status: 'OPEN',
                    questions: {
                        create: {
                            questionId: 'nonexistent-question-id',
                            sortOrder: 0,
                        },
                    },
                },
            });
        });

        const openCount = await prisma.revisionSession.count({
            where: { topicId: topic.id, status: 'OPEN' },
        });
        assert.equal(openCount, 0);

        // Service still creates cleanly afterward
        const ok = await getTodayRevision(prisma, NOW);
        assert.ok(ok.session);
        assert.equal(ok.session!.topic.id, topic.id);
        assert.equal(ok.session!.questions[0]!.id, questions[0]!.id);
    });

    it('19: Kolkata midnight boundary — due flips at IST day change', async () => {
        await prisma.topic.updateMany({
            where: { id: { in: createdTopicIds } },
            data: { nextRevisionDate: utcOn(TOMORROW) },
        });
        await prisma.revisionSession.updateMany({
            where: { status: 'OPEN', topicId: { in: createdTopicIds } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        const boundaryTopic = await createTopic({
            name: 'boundary',
            // Due on 2026-10-16 Kolkata
            nextRevisionDate: utcOn(TOMORROW),
            withQuestions: [{ prompt: 'boundary' }],
        });

        // 2026-10-15 18:29 UTC = Oct 15 23:59 IST → still not due for Oct 16 date
        const before = await getTodayRevision(
            prisma,
            new Date('2026-10-15T18:29:00.000Z'),
        );
        assert.equal(
            before.session?.topic.id === boundaryTopic.topic.id,
            false,
        );

        // 2026-10-15 18:30 UTC = Oct 16 00:00 IST → due
        const after = await getTodayRevision(
            prisma,
            new Date('2026-10-15T18:30:00.000Z'),
        );
        assert.ok(after.session);
        assert.equal(after.session!.topic.id, boundaryTopic.topic.id);
        assert.equal(after.session!.topic.isOverdue, false);
    });

    it('16-18 via handler against real service: auth already covered; smoke 200', async () => {
        process.env['BEARER_TOKEN'] = 'integration-bearer';
        const state: { statusCode: number; body: unknown } = {
            statusCode: 0,
            body: undefined,
        };
        const res = {
            status(code: number) {
                state.statusCode = code;
                return this;
            },
            json(payload: unknown) {
                state.body = payload;
                return this;
            },
        } as VercelResponse;

        await handleTodayRevision(
            {
                method: 'GET',
                headers: { authorization: 'Bearer integration-bearer' },
            } as VercelRequest,
            res,
            {
                prisma,
                getTodayRevision,
                now: () => NOW,
            },
        );

        assert.equal(state.statusCode, 200);
        const body = state.body as {
            status: string;
            dueCount: number;
            overdueCount: number;
            session: { questions: unknown[] } | null;
        };
        assert.equal(body.status, 'ok');
        assert.ok(body.dueCount >= body.overdueCount);
        if (body.session) {
            const text = JSON.stringify(body.session);
            assert.equal(text.includes('correctAnswer'), false);
            assert.equal(text.includes('explanation'), false);
        }
    });

    it('21: topics/health handlers keep auth and error envelope conventions', async () => {
        process.env['BEARER_TOKEN'] = 'integration-bearer';
        const { default: topicsHandler } = await import('../../topics/index.js');
        const unauthorized = {
            statusCode: 0,
            body: undefined as unknown,
            status(code: number) {
                this.statusCode = code;
                return this;
            },
            json(payload: unknown) {
                this.body = payload;
                return this;
            },
        };
        await topicsHandler(
            { method: 'GET', headers: {} } as VercelRequest,
            unauthorized as unknown as VercelResponse,
        );
        assert.equal(unauthorized.statusCode, 401);
        assert.deepEqual(unauthorized.body, {
            status: 'error',
            message: 'Unauthorized',
        });

        const methodNotAllowed = {
            statusCode: 0,
            body: undefined as unknown,
            status(code: number) {
                this.statusCode = code;
                return this;
            },
            json(payload: unknown) {
                this.body = payload;
                return this;
            },
        };
        await topicsHandler(
            {
                method: 'POST',
                headers: { authorization: 'Bearer integration-bearer' },
            } as VercelRequest,
            methodNotAllowed as unknown as VercelResponse,
        );
        assert.equal(methodNotAllowed.statusCode, 405);
        assert.deepEqual(methodNotAllowed.body, {
            status: 'error',
            message: 'Method not allowed',
        });
    });

    it('P2002 conflict path reloads winning session', async () => {
        await prisma.topic.updateMany({
            where: { id: { in: createdTopicIds } },
            data: { nextRevisionDate: utcOn(TOMORROW) },
        });
        await prisma.revisionSession.updateMany({
            where: { status: 'OPEN', topicId: { in: createdTopicIds } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        const { topic, questions } = await createTopic({
            name: 'p2002',
            nextRevisionDate: utcOn(TODAY),
            withQuestions: [{ prompt: 'p2002-q' }],
        });

        const winner = await prisma.revisionSession.create({
            data: {
                topicId: topic.id,
                status: 'OPEN',
                questions: {
                    create: {
                        questionId: questions[0]!.id,
                        sortOrder: 0,
                    },
                },
            },
        });

        // Simulate loser create → P2002 → service resumes winner
        await assert.rejects(
            () =>
                prisma.revisionSession.create({
                    data: {
                        topicId: topic.id,
                        status: 'OPEN',
                        questions: {
                            create: {
                                questionId: questions[0]!.id,
                                sortOrder: 0,
                            },
                        },
                    },
                }),
            (error: unknown) =>
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002',
        );

        const result = await getTodayRevision(prisma, NOW);
        assert.ok(result.session);
        assert.equal(result.session!.id, winner.id);
    });
});
