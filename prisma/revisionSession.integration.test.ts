// prisma/revisionSession.integration.test.ts
// Database-backed verification against disposable PostgreSQL only (DATABASE_URL_TEST).

import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    Prisma,
    PrismaClient,
    QuestionFormat,
    SessionType,
} from '../generated/prisma/client.js';
import {
    assertQuestionNotInOpenRevisionSession,
} from './openSessionQuestionGuard.js';

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
        throw new Error(
            `Refusing non-localhost test host: ${parsed.hostname}`,
        );
    }

    return url;
}

const TEST_PREFIX = `migtest-${Date.now()}`;

describe('revision session migration (integration / disposable DB)', () => {
    const databaseUrl = requireTestDatabaseUrl();
    const pool = new Pool({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    let topicId = '';
    let questionId = '';
    let unreferencedQuestionId = '';

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

        const topic = await prisma.topic.create({
            data: {
                name: `${TEST_PREFIX}-topic`,
                slug: `${TEST_PREFIX}-topic`,
                category: 'Fundamentals',
            },
        });
        topicId = topic.id;

        const question = await prisma.question.create({
            data: {
                topicId,
                sessionType: SessionType.REVISION,
                format: QuestionFormat.MULTIPLE_CHOICE,
                prompt: `${TEST_PREFIX} prompt A`,
                options: ['a', 'b'],
                correctAnswer: '0',
                explanation: 'because',
            },
        });
        questionId = question.id;

        const unreferenced = await prisma.question.create({
            data: {
                topicId,
                sessionType: SessionType.REVISION,
                format: QuestionFormat.SHORT_ANSWER,
                prompt: `${TEST_PREFIX} prompt B`,
                correctAnswer: 'reference',
            },
        });
        unreferencedQuestionId = unreferenced.id;
    });

    after(async () => {
        // Clean only fixtures created by this suite.
        if (topicId) {
            await prisma.revisionSessionQuestion.deleteMany({
                where: { session: { topicId } },
            });
            await prisma.sessionLog.deleteMany({ where: { topicId } });
            await prisma.revisionSession.deleteMany({ where: { topicId } });
            await prisma.question.deleteMany({ where: { topicId } });
            await prisma.topic.deleteMany({ where: { id: topicId } });
        }
        await prisma.$disconnect();
        await pool.end();
    });

    it('A: concurrent OPEN creates leave at most one OPEN session; conflict can reload it', async () => {
        const createOnce = async () => {
            try {
                return await prisma.revisionSession.create({
                    data: {
                        topicId,
                        status: 'OPEN',
                        questions: {
                            create: {
                                questionId,
                                sortOrder: 0,
                            },
                        },
                    },
                });
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002'
                ) {
                    const existing = await prisma.revisionSession.findFirst({
                        where: { topicId, status: 'OPEN' },
                    });
                    assert.ok(existing, 'expected existing OPEN session after conflict');
                    return existing;
                }
                throw error;
            }
        };

        const [a, b] = await Promise.all([createOnce(), createOnce()]);
        assert.equal(a.id, b.id);

        const openCount = await prisma.revisionSession.count({
            where: { topicId, status: 'OPEN' },
        });
        assert.equal(openCount, 1);

        // Ensure association exists once (second create may have failed before questions insert)
        const associationCount = await prisma.revisionSessionQuestion.count({
            where: { sessionId: a.id },
        });
        if (associationCount === 0) {
            await prisma.revisionSessionQuestion.create({
                data: { sessionId: a.id, questionId, sortOrder: 0 },
            });
        }
    });

    it('B: deleting a question referenced by a session is restricted', async () => {
        await assert.rejects(
            () => prisma.question.delete({ where: { id: questionId } }),
            (error: unknown) =>
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2003',
        );

        const stillThere = await prisma.question.findUnique({
            where: { id: questionId },
        });
        assert.ok(stillThere);
    });

    it('C: OPEN-session reseed guard rejects content mutation before update', async () => {
        await assert.rejects(
            () =>
                assertQuestionNotInOpenRevisionSession(
                    prisma,
                    questionId,
                    'integration-test',
                ),
            /OPEN revision session/,
        );

        const before = await prisma.question.findUniqueOrThrow({
            where: { id: questionId },
        });

        // Simulate seed update path: guard then update — guard must throw first.
        await assert.rejects(async () => {
            await assertQuestionNotInOpenRevisionSession(
                prisma,
                questionId,
                'integration-test',
            );
            await prisma.question.update({
                where: { id: questionId },
                data: { explanation: 'MUTATED' },
            });
        }, /OPEN revision session/);

        const after = await prisma.question.findUniqueOrThrow({
            where: { id: questionId },
        });
        assert.equal(after.explanation, before.explanation);
        assert.notEqual(after.explanation, 'MUTATED');
    });

    it('D: unreferenced question content can still be updated', async () => {
        await assertQuestionNotInOpenRevisionSession(
            prisma,
            unreferencedQuestionId,
            'integration-test',
        );

        const updated = await prisma.question.update({
            where: { id: unreferencedQuestionId },
            data: { explanation: 'safe-update' },
        });
        assert.equal(updated.explanation, 'safe-update');
    });

    it('E: schema supports completion audit fields (API idempotency not tested)', async () => {
        const open = await prisma.revisionSession.findFirstOrThrow({
            where: { topicId, status: 'OPEN' },
        });

        const completed = await prisma.revisionSession.update({
            where: { id: open.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                outcome: 'ADVANCE',
                previousIntervalDays: 1,
                resultingIntervalDays: 3,
                previousNextRevisionDate: new Date('2026-01-01T00:00:00.000Z'),
                resultingNextRevisionDate: new Date('2026-01-04T00:00:00.000Z'),
                policyVersion: 'phase3-g5-v1',
            },
        });

        assert.equal(completed.status, 'COMPLETED');
        assert.equal(completed.outcome, 'ADVANCE');
        assert.ok(completed.completedAt);

        // Second OPEN for same topic is allowed after COMPLETED (partial unique only on OPEN).
        const secondOpen = await prisma.revisionSession.create({
            data: { topicId, status: 'OPEN' },
        });
        assert.notEqual(secondOpen.id, completed.id);

        const openCount = await prisma.revisionSession.count({
            where: { topicId, status: 'OPEN' },
        });
        assert.equal(openCount, 1);
    });

    it('F: SessionLog preserves legacy columns and enforces session uniqueness', async () => {
        const session = await prisma.revisionSession.findFirstOrThrow({
            where: { topicId, status: 'OPEN' },
        });

        // Ensure association for logging
        await prisma.revisionSessionQuestion.upsert({
            where: {
                sessionId_questionId: {
                    sessionId: session.id,
                    questionId,
                },
            },
            create: { sessionId: session.id, questionId, sortOrder: 0 },
            update: {},
        });

        const log = await prisma.sessionLog.create({
            data: {
                topicId,
                questionId,
                sessionId: session.id,
                sessionType: SessionType.REVISION,
                selectedAnswer: '0',
                correct: true,
                confidence: 'EASY',
            },
        });

        assert.equal(log.selectedAnswer, '0');
        assert.equal(log.correct, true);
        assert.equal(log.confidence, 'EASY');
        assert.ok(log.answeredAt);
        assert.equal(log.sessionType, SessionType.REVISION);

        await assert.rejects(
            () =>
                prisma.sessionLog.create({
                    data: {
                        topicId,
                        questionId,
                        sessionId: session.id,
                        sessionType: SessionType.REVISION,
                        selectedAnswer: '1',
                        correct: false,
                        confidence: 'OKAY',
                    },
                }),
            (error: unknown) =>
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002',
        );

        const colCheck = await pool.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema='public' AND table_name='SessionLog'
             ORDER BY ordinal_position`,
        );
        const names = colCheck.rows.map((row) => row.column_name);
        for (const required of [
            'id',
            'topicId',
            'questionId',
            'sessionType',
            'correct',
            'confidence',
            'answeredAt',
            'selectedAnswer',
            'sessionId',
        ]) {
            assert.ok(names.includes(required), `missing column ${required}`);
        }
    });
});
