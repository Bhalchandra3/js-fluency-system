// api/_lib/revision/answerComplete.integration.test.ts
// Disposable PostgreSQL tests for answer upsert + explicit complete.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    PrismaClient,
    QuestionFormat,
    SessionType,
} from '../../../generated/prisma/client.js';
import { ConfidenceLevel } from '../../../generated/prisma/enums.js';
import { getTodayRevision } from './todayService.js';
import { submitRevisionAnswer } from './answerService.js';
import { completeRevisionSession } from './completeService.js';
import { RevisionApiError } from './errors.js';
import { kolkataCalendarDateToUtcInstant } from '../scheduling/calendarDay.js';

function requireTestDatabaseUrl(): string {
    const url = process.env['DATABASE_URL_TEST'];
    if (!url) {
        throw new Error(
            'DATABASE_URL_TEST must be set to the disposable Postgres URL.',
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

const PREFIX = `ans-${Date.now()}`;
const NOW = new Date('2026-10-15T12:00:00.000Z');
const TODAY = kolkataCalendarDateToUtcInstant({ year: 2026, month: 10, day: 15 });
const TOMORROW = kolkataCalendarDateToUtcInstant({ year: 2026, month: 10, day: 16 });

describe('revision answers + complete (integration / disposable DB)', () => {
    const databaseUrl = requireTestDatabaseUrl();
    const pool = new Pool({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const topicIds: string[] = [];

    async function isolate(activeTopicId: string) {
        await prisma.revisionSession.updateMany({
            where: { status: 'OPEN', topicId: { in: topicIds } },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });
        const others = topicIds.filter((id) => id !== activeTopicId);
        if (others.length > 0) {
            await prisma.topic.updateMany({
                where: { id: { in: others } },
                data: { nextRevisionDate: TOMORROW },
            });
        }
    }

    async function seedTopic(input: {
        name: string;
        intervalDays?: number;
        questions: Array<{
            format: QuestionFormat;
            prompt: string;
            options?: string[];
            correctAnswer?: string;
            explanation?: string;
        }>;
    }) {
        const topic = await prisma.topic.create({
            data: {
                name: `${PREFIX}-${input.name}`,
                slug: `${PREFIX}-${input.name}`,
                category: 'Fundamentals',
                intervalDays: input.intervalDays ?? 7,
                nextRevisionDate: TODAY,
            },
        });
        topicIds.push(topic.id);
        await isolate(topic.id);

        const questions = [];
        for (const [index, q] of input.questions.entries()) {
            questions.push(
                await prisma.question.create({
                    data: {
                        topicId: topic.id,
                        sessionType: SessionType.REVISION,
                        format: q.format,
                        prompt: q.prompt,
                        options: q.options ?? undefined,
                        correctAnswer: q.correctAnswer ?? null,
                        explanation: q.explanation ?? null,
                        createdAt: new Date(Date.UTC(2026, 0, 1 + index)),
                    },
                }),
            );
        }

        const today = await getTodayRevision(prisma, NOW);
        assert.ok(today.session);
        assert.equal(today.session!.topic.id, topic.id);

        return { topic, questions, sessionId: today.session!.id };
    }

    before(async () => {
        const identity = await pool.query(
            'SELECT current_database() AS db, inet_server_addr()::text AS addr',
        );
        assert.equal(identity.rows[0].db, 'jsfluency_test');
    });

    after(async () => {
        if (topicIds.length > 0) {
            await prisma.sessionLog.deleteMany({ where: { topicId: { in: topicIds } } });
            await prisma.revisionSessionQuestion.deleteMany({
                where: { session: { topicId: { in: topicIds } } },
            });
            await prisma.revisionSession.deleteMany({
                where: { topicId: { in: topicIds } },
            });
            await prisma.question.deleteMany({ where: { topicId: { in: topicIds } } });
            await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
        }
        await prisma.$disconnect();
        await pool.end();
    });

    it('MCQ correct/incorrect, confidence, upsert, answeredAt refresh, no schedule change', async () => {
        const { topic, questions, sessionId } = await seedTopic({
            name: 'mcq',
            questions: [
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'mcq-1',
                    options: ['a', 'b', 'c'],
                    correctAnswer: '1',
                    explanation: 'because-b',
                },
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'mcq-2',
                    options: ['x', 'y'],
                    correctAnswer: '0',
                },
            ],
        });

        const beforeInterval = topic.intervalDays;
        const beforeDue = topic.nextRevisionDate;

        const wrong = await submitRevisionAnswer(
            prisma,
            {
                sessionId,
                questionId: questions[0]!.id,
                selectedAnswer: '0',
                confidence: ConfidenceLevel.EASY,
            },
            NOW,
        );
        assert.equal(wrong.correct, false);
        assert.equal(wrong.correctAnswer, '1');
        assert.equal(wrong.explanation, 'because-b');
        assert.equal(wrong.sessionStatus, 'OPEN');
        assert.equal(wrong.canComplete, false);
        assert.deepEqual(wrong.progress, { answered: 1, total: 2 });

        const firstLog = await prisma.sessionLog.findUnique({
            where: {
                sessionId_questionId: {
                    sessionId,
                    questionId: questions[0]!.id,
                },
            },
        });
        assert.ok(firstLog);
        const firstAnsweredAt = firstLog!.answeredAt;

        const later = new Date(NOW.getTime() + 60_000);
        const fixed = await submitRevisionAnswer(
            prisma,
            {
                sessionId,
                questionId: questions[0]!.id,
                selectedAnswer: '1',
                confidence: ConfidenceLevel.OKAY,
            },
            later,
        );
        assert.equal(fixed.correct, true);

        const upserted = await prisma.sessionLog.findUnique({
            where: {
                sessionId_questionId: {
                    sessionId,
                    questionId: questions[0]!.id,
                },
            },
        });
        assert.ok(upserted);
        assert.equal(upserted!.selectedAnswer, '1');
        assert.equal(upserted!.confidence, ConfidenceLevel.OKAY);
        assert.ok(upserted!.answeredAt.getTime() > firstAnsweredAt.getTime());

        const logCount = await prisma.sessionLog.count({ where: { sessionId } });
        assert.equal(logCount, 1);

        const topicAfter = await prisma.topic.findUniqueOrThrow({
            where: { id: topic.id },
        });
        assert.equal(topicAfter.intervalDays, beforeInterval);
        assert.equal(
            topicAfter.nextRevisionDate.toISOString(),
            beforeDue.toISOString(),
        );

        // GET today still leaks no answers
        const today = await getTodayRevision(prisma, NOW);
        const serialized = JSON.stringify(today);
        assert.equal(serialized.includes('correctAnswer'), false);
        assert.equal(serialized.includes('explanation'), false);
        assert.equal(serialized.includes('because-b'), false);
    });

    it('SHORT_ANSWER self-assess + rejects MCQ selfAssessedCorrect + invalid index', async () => {
        const { questions, sessionId } = await seedTopic({
            name: 'short',
            questions: [
                {
                    format: QuestionFormat.SHORT_ANSWER,
                    prompt: 'sa',
                    correctAnswer: 'long prose reference answer',
                    explanation: 'why',
                },
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'mcq',
                    options: ['a', 'b'],
                    correctAnswer: '0',
                },
            ],
        });

        const sa = await submitRevisionAnswer(prisma, {
            sessionId,
            questionId: questions[0]!.id,
            selectedAnswer: 'my words',
            confidence: ConfidenceLevel.DIFFICULT,
            selfAssessedCorrect: false,
        });
        assert.equal(sa.correct, false);
        assert.equal(sa.correctAnswer, 'long prose reference answer');

        await assert.rejects(
            () =>
                submitRevisionAnswer(prisma, {
                    sessionId,
                    questionId: questions[1]!.id,
                    selectedAnswer: '0',
                    confidence: ConfidenceLevel.EASY,
                    selfAssessedCorrect: null,
                }),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 400,
        );

        await assert.rejects(
            () =>
                submitRevisionAnswer(prisma, {
                    sessionId,
                    questionId: questions[1]!.id,
                    selectedAnswer: '9',
                    confidence: ConfidenceLevel.EASY,
                }),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 400,
        );
    });

    it('rejects unknown session, out-of-freeze question, invalid confidence', async () => {
        const { questions, sessionId } = await seedTopic({
            name: 'reject',
            questions: [
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'q',
                    options: ['a', 'b'],
                    correctAnswer: '0',
                },
            ],
        });

        const outsider = await prisma.question.create({
            data: {
                topicId: topicIds[topicIds.length - 1]!,
                sessionType: SessionType.REVISION,
                format: QuestionFormat.SHORT_ANSWER,
                prompt: 'not frozen',
                correctAnswer: 'x',
            },
        });

        await assert.rejects(
            () =>
                submitRevisionAnswer(prisma, {
                    sessionId: 'missing-session',
                    questionId: questions[0]!.id,
                    selectedAnswer: '0',
                    confidence: ConfidenceLevel.EASY,
                }),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 404,
        );

        await assert.rejects(
            () =>
                submitRevisionAnswer(prisma, {
                    sessionId,
                    questionId: outsider.id,
                    selectedAnswer: 'hello',
                    confidence: ConfidenceLevel.EASY,
                    selfAssessedCorrect: true,
                }),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 409,
        );

        await assert.rejects(
            () =>
                submitRevisionAnswer(prisma, {
                    sessionId,
                    questionId: questions[0]!.id,
                    selectedAnswer: '0',
                    confidence: 'NOPE',
                }),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 400,
        );
    });

    it('incomplete complete → 409; successful G5 complete; duplicate idempotent; answer after complete 409', async () => {
        const { topic, questions, sessionId } = await seedTopic({
            name: 'complete',
            intervalDays: 7,
            questions: [
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'c1',
                    options: ['a', 'b'],
                    correctAnswer: '0',
                },
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'c2',
                    options: ['a', 'b'],
                    correctAnswer: '1',
                },
            ],
        });

        await assert.rejects(
            () => completeRevisionSession(prisma, { sessionId }, NOW),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 409,
        );

        const topicMid = await prisma.topic.findUniqueOrThrow({
            where: { id: topic.id },
        });
        assert.equal(topicMid.intervalDays, 7);

        await submitRevisionAnswer(prisma, {
            sessionId,
            questionId: questions[0]!.id,
            selectedAnswer: '0',
            confidence: ConfidenceLevel.DIFFICULT,
        });
        await submitRevisionAnswer(prisma, {
            sessionId,
            questionId: questions[1]!.id,
            selectedAnswer: '1',
            confidence: ConfidenceLevel.OKAY,
        });

        const done = await completeRevisionSession(prisma, { sessionId }, NOW);
        assert.equal(done.sessionStatus, 'COMPLETED');
        assert.equal(done.scheduling.outcome, 'REINFORCE');
        assert.equal(done.scheduling.previousIntervalDays, 7);
        assert.equal(done.scheduling.resultingIntervalDays, 3);
        assert.equal(done.scheduling.policyVersion, 'phase3-g5-v1');
        assert.match(done.scheduling.reason, /DIFFICULT/);

        const topicDone = await prisma.topic.findUniqueOrThrow({
            where: { id: topic.id },
        });
        assert.equal(topicDone.intervalDays, 3);
        assert.equal(
            topicDone.nextRevisionDate.toISOString(),
            done.scheduling.resultingNextRevisionDate,
        );

        const again = await completeRevisionSession(prisma, { sessionId }, NOW);
        assert.equal(again.scheduling.outcome, 'REINFORCE');
        assert.equal(again.scheduling.resultingIntervalDays, 3);
        assert.equal(
            again.scheduling.resultingNextRevisionDate,
            done.scheduling.resultingNextRevisionDate,
        );
        assert.match(again.scheduling.reason, /DIFFICULT/);

        // Topic unchanged on duplicate complete
        const topicAgain = await prisma.topic.findUniqueOrThrow({
            where: { id: topic.id },
        });
        assert.equal(topicAgain.intervalDays, 3);

        await assert.rejects(
            () =>
                submitRevisionAnswer(prisma, {
                    sessionId,
                    questionId: questions[0]!.id,
                    selectedAnswer: '0',
                    confidence: ConfidenceLevel.EASY,
                }),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 409,
        );
    });

    it('G5 RESET / REINFORCE_AT_1 / ADVANCE branches + ladder boundaries', async () => {
        async function runBranch(
            name: string,
            intervalDays: number,
            answers: Array<{ selected: string; confidence: ConfidenceLevel }>,
            expected: { outcome: string; resulting: number },
        ) {
            const { topic, questions, sessionId } = await seedTopic({
                name,
                intervalDays,
                questions: [
                    {
                        format: QuestionFormat.MULTIPLE_CHOICE,
                        prompt: `${name}-1`,
                        options: ['a', 'b'],
                        correctAnswer: '0',
                    },
                    {
                        format: QuestionFormat.MULTIPLE_CHOICE,
                        prompt: `${name}-2`,
                        options: ['a', 'b'],
                        correctAnswer: '0',
                    },
                ],
            });

            for (const [index, answer] of answers.entries()) {
                await submitRevisionAnswer(prisma, {
                    sessionId,
                    questionId: questions[index]!.id,
                    selectedAnswer: answer.selected,
                    confidence: answer.confidence,
                });
            }

            const result = await completeRevisionSession(prisma, { sessionId }, NOW);
            assert.equal(result.scheduling.outcome, expected.outcome);
            assert.equal(result.scheduling.resultingIntervalDays, expected.resulting);
            const refreshed = await prisma.topic.findUniqueOrThrow({
                where: { id: topic.id },
            });
            assert.equal(refreshed.intervalDays, expected.resulting);
        }

        await runBranch(
            'reset',
            14,
            [
                { selected: '1', confidence: ConfidenceLevel.EASY },
                { selected: '0', confidence: ConfidenceLevel.EASY },
            ],
            { outcome: 'RESET', resulting: 1 },
        );

        await runBranch(
            'r1',
            30,
            [
                { selected: '0', confidence: ConfidenceLevel.DIDNT_UNDERSTAND },
                { selected: '0', confidence: ConfidenceLevel.DIFFICULT },
            ],
            { outcome: 'REINFORCE_AT_1', resulting: 1 },
        );

        await runBranch(
            'adv30',
            30,
            [
                { selected: '0', confidence: ConfidenceLevel.EASY },
                { selected: '0', confidence: ConfidenceLevel.OKAY },
            ],
            { outcome: 'ADVANCE', resulting: 30 },
        );

        await runBranch(
            'reif1',
            1,
            [
                { selected: '0', confidence: ConfidenceLevel.DIFFICULT },
                { selected: '0', confidence: ConfidenceLevel.OKAY },
            ],
            { outcome: 'REINFORCE', resulting: 1 },
        );
    });

    it('concurrent completes update schedule once; concurrent answers stay single log', async () => {
        const { topic, questions, sessionId } = await seedTopic({
            name: 'race',
            intervalDays: 7,
            questions: [
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'r1',
                    options: ['a', 'b'],
                    correctAnswer: '0',
                },
                {
                    format: QuestionFormat.MULTIPLE_CHOICE,
                    prompt: 'r2',
                    options: ['a', 'b'],
                    correctAnswer: '0',
                },
            ],
        });

        await Promise.all([
            submitRevisionAnswer(prisma, {
                sessionId,
                questionId: questions[0]!.id,
                selectedAnswer: '0',
                confidence: ConfidenceLevel.OKAY,
            }),
            submitRevisionAnswer(prisma, {
                sessionId,
                questionId: questions[0]!.id,
                selectedAnswer: '0',
                confidence: ConfidenceLevel.EASY,
            }),
        ]);
        assert.equal(await prisma.sessionLog.count({ where: { sessionId } }), 1);

        await submitRevisionAnswer(prisma, {
            sessionId,
            questionId: questions[1]!.id,
            selectedAnswer: '0',
            confidence: ConfidenceLevel.OKAY,
        });

        const [a, b] = await Promise.all([
            completeRevisionSession(prisma, { sessionId }, NOW),
            completeRevisionSession(prisma, { sessionId }, NOW),
        ]);
        assert.equal(a.sessionStatus, 'COMPLETED');
        assert.equal(b.sessionStatus, 'COMPLETED');
        assert.equal(a.scheduling.resultingIntervalDays, b.scheduling.resultingIntervalDays);

        const topicAfter = await prisma.topic.findUniqueOrThrow({
            where: { id: topic.id },
        });
        assert.equal(topicAfter.intervalDays, 14);

        const completedCount = await prisma.revisionSession.count({
            where: { id: sessionId, status: 'COMPLETED' },
        });
        assert.equal(completedCount, 1);
    });

    it('empty frozen set cannot complete', async () => {
        const topic = await prisma.topic.create({
            data: {
                name: `${PREFIX}-empty-freeze`,
                slug: `${PREFIX}-empty-freeze`,
                category: 'Fundamentals',
                intervalDays: 1,
                nextRevisionDate: TODAY,
            },
        });
        topicIds.push(topic.id);

        const session = await prisma.revisionSession.create({
            data: { topicId: topic.id, status: 'OPEN' },
        });

        await assert.rejects(
            () => completeRevisionSession(prisma, { sessionId: session.id }, NOW),
            (error: unknown) =>
                error instanceof RevisionApiError && error.statusCode === 409,
        );
    });
});
