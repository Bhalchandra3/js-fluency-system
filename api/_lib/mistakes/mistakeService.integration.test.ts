// api/_lib/mistakes/mistakeService.integration.test.ts
// Disposable PostgreSQL tests for Mistake Log services (§2.5.5).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    PrismaClient,
    QuestionFormat,
    SessionType,
} from '../../../generated/prisma/client.js';
import { MistakeApiError } from './errors.js';
import {
    createMistake,
    getMistakeById,
    listMistakes,
    updateMistake,
} from './mistakeService.js';

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

const PREFIX = `mist-api-${Date.now()}`;
const NOW = new Date('2026-10-24T15:00:00.000Z');

describe('mistakeService (integration / disposable DB)', () => {
    const databaseUrl = requireTestDatabaseUrl();
    const pool = new Pool({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    let topicAId = '';
    let topicBId = '';
    let questionAId = '';
    let questionBId = '';
    const mistakeIds: string[] = [];

    before(async () => {
        const identity = await pool.query(
            'SELECT current_database() AS db, inet_server_addr()::text AS addr',
        );
        assert.equal(identity.rows[0].db, 'jsfluency_test');

        const topicA = await prisma.topic.create({
            data: {
                name: `${PREFIX}-a`,
                slug: `${PREFIX}-a`,
                category: 'Fundamentals',
            },
        });
        const topicB = await prisma.topic.create({
            data: {
                name: `${PREFIX}-b`,
                slug: `${PREFIX}-b`,
                category: 'Fundamentals',
            },
        });
        topicAId = topicA.id;
        topicBId = topicB.id;

        const questionA = await prisma.question.create({
            data: {
                topicId: topicAId,
                sessionType: SessionType.REVISION,
                format: QuestionFormat.MULTIPLE_CHOICE,
                prompt: `${PREFIX}-q-a`,
                options: ['a', 'b'],
                correctAnswer: '0',
            },
        });
        const questionB = await prisma.question.create({
            data: {
                topicId: topicBId,
                sessionType: SessionType.REVISION,
                format: QuestionFormat.SHORT_ANSWER,
                prompt: `${PREFIX}-q-b`,
            },
        });
        questionAId = questionA.id;
        questionBId = questionB.id;
    });

    after(async () => {
        if (mistakeIds.length > 0) {
            await prisma.mistake.deleteMany({ where: { id: { in: mistakeIds } } });
        }
        await prisma.mistake.deleteMany({
            where: { topicId: { in: [topicAId, topicBId].filter(Boolean) } },
        });
        if (topicAId || topicBId) {
            await prisma.question.deleteMany({
                where: { topicId: { in: [topicAId, topicBId].filter(Boolean) } },
            });
            await prisma.topic.deleteMany({
                where: { id: { in: [topicAId, topicBId].filter(Boolean) } },
            });
        }
        await prisma.$disconnect();
        await pool.end();
    });

    it('manual create, list filters/pagination, detail, resolve lifecycle, provenance protection', async () => {
        const created = await createMistake(prisma, {
            topicId: topicAId,
            mistakeText: 'Manual misunderstanding',
            correctUnderstanding: 'Manual correction',
            questionId: questionAId,
        });
        mistakeIds.push(created.mistake.id);

        assert.equal(created.status, 'ok');
        assert.equal(created.mistake.topicId, topicAId);
        assert.equal(created.mistake.questionId, questionAId);
        assert.equal(created.mistake.sessionId, null);
        assert.equal(created.mistake.sourceSessionLogId, null);
        assert.equal(created.mistake.turnedIntoQuestion, false);
        assert.equal(created.mistake.resolvedAt, null);
        assert.equal(created.mistake.topic.slug, `${PREFIX}-a`);

        await assert.rejects(
            () =>
                createMistake(prisma, {
                    topicId: topicAId,
                    mistakeText: 'x',
                    correctUnderstanding: 'y',
                    sourceSessionLogId: 'forged',
                }),
            (error: unknown) =>
                error instanceof MistakeApiError &&
                error.statusCode === 400 &&
                /sourceSessionLogId/.test(error.message),
        );

        await assert.rejects(
            () =>
                createMistake(prisma, {
                    topicId: topicAId,
                    mistakeText: 'x',
                    correctUnderstanding: 'y',
                    sessionId: 'forged',
                }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );

        await assert.rejects(
            () =>
                createMistake(prisma, {
                    topicId: topicAId,
                    mistakeText: 'x',
                    correctUnderstanding: 'y',
                    questionId: questionBId,
                }),
            (error: unknown) =>
                error instanceof MistakeApiError &&
                error.statusCode === 400 &&
                /belong/.test(error.message),
        );

        await assert.rejects(
            () =>
                createMistake(prisma, {
                    topicId: 'missing-topic',
                    mistakeText: 'x',
                    correctUnderstanding: 'y',
                }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 404,
        );

        const other = await createMistake(prisma, {
            topicId: topicBId,
            mistakeText: 'Other topic mistake',
            correctUnderstanding: 'Other correction',
        });
        mistakeIds.push(other.mistake.id);

        const resolvedSeed = await createMistake(prisma, {
            topicId: topicAId,
            mistakeText: 'Will resolve',
            correctUnderstanding: 'Resolved understanding',
        });
        mistakeIds.push(resolvedSeed.mistake.id);
        const resolvedOnce = await updateMistake(
            prisma,
            resolvedSeed.mistake.id,
            { resolved: true },
            NOW,
        );
        assert.equal(resolvedOnce.mistake.resolvedAt, NOW.toISOString());

        const listedAllA = await listMistakes(prisma, { topicId: topicAId });
        assert.equal(listedAllA.status, 'ok');
        assert.equal(listedAllA.total, 2);
        assert.equal(listedAllA.mistakes.length, 2);

        const unresolved = await listMistakes(prisma, {
            topicId: topicAId,
            unresolvedOnly: 'true',
        });
        assert.equal(unresolved.total, 1);
        assert.equal(unresolved.mistakes[0]!.id, created.mistake.id);

        const page = await listMistakes(prisma, {
            topicId: topicAId,
            limit: '1',
            offset: '0',
        });
        assert.equal(page.mistakes.length, 1);
        assert.equal(page.total, 2);

        const page2 = await listMistakes(prisma, {
            topicId: topicAId,
            limit: '1',
            offset: '1',
        });
        assert.equal(page2.mistakes.length, 1);
        assert.notEqual(page.mistakes[0]!.id, page2.mistakes[0]!.id);

        await assert.rejects(
            () => listMistakes(prisma, { limit: '0' }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () => listMistakes(prisma, { limit: '201' }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () => listMistakes(prisma, { offset: '-1' }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () => listMistakes(prisma, { unresolvedOnly: 'yes' }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );

        const detail = await getMistakeById(prisma, created.mistake.id);
        assert.equal(detail.mistake.topic.name, `${PREFIX}-a`);
        assert.equal(detail.mistake.questionId, questionAId);

        await assert.rejects(
            () => getMistakeById(prisma, 'missing-mistake'),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 404,
        );

        const patched = await updateMistake(prisma, created.mistake.id, {
            mistakeText: 'Edited text',
            correctUnderstanding: 'Edited understanding',
            turnedIntoQuestion: true,
        });
        assert.equal(patched.mistake.mistakeText, 'Edited text');
        assert.equal(patched.mistake.correctUnderstanding, 'Edited understanding');
        assert.equal(patched.mistake.turnedIntoQuestion, true);
        assert.equal(patched.mistake.sourceSessionLogId, null);

        await assert.rejects(
            () =>
                updateMistake(prisma, created.mistake.id, {
                    sourceSessionLogId: 'forge',
                }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () =>
                updateMistake(prisma, created.mistake.id, {
                    questionId: questionAId,
                }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () =>
                updateMistake(prisma, created.mistake.id, {
                    topicId: topicBId,
                }),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () => updateMistake(prisma, created.mistake.id, {}),
            (error: unknown) =>
                error instanceof MistakeApiError && error.statusCode === 400,
        );

        const firstResolve = await updateMistake(
            prisma,
            created.mistake.id,
            { resolved: true },
            NOW,
        );
        assert.equal(firstResolve.mistake.resolvedAt, NOW.toISOString());

        const later = new Date('2026-10-24T18:00:00.000Z');
        const reResolve = await updateMistake(
            prisma,
            created.mistake.id,
            { resolved: true },
            later,
        );
        // Idempotent re-resolve keeps original resolvedAt
        assert.equal(reResolve.mistake.resolvedAt, NOW.toISOString());

        const unresolvedAgain = await updateMistake(
            prisma,
            created.mistake.id,
            { resolved: false },
            later,
        );
        assert.equal(unresolvedAgain.mistake.resolvedAt, null);

        // Nullable provenance: multiple manuals with null sourceSessionLogId
        const manual2 = await createMistake(prisma, {
            topicId: topicAId,
            mistakeText: 'Second manual',
            correctUnderstanding: 'Second correction',
        });
        mistakeIds.push(manual2.mistake.id);
        assert.equal(manual2.mistake.sourceSessionLogId, null);

        // Auto-style row with unique sourceSessionLogId must not be mutated via PATCH provenance
        const session = await prisma.revisionSession.create({
            data: { topicId: topicAId, status: 'COMPLETED', completedAt: NOW },
        });
        const log = await prisma.sessionLog.create({
            data: {
                topicId: topicAId,
                questionId: questionAId,
                sessionId: session.id,
                sessionType: SessionType.REVISION,
                selectedAnswer: '1',
                correct: false,
                confidence: 'EASY',
            },
        });
        const auto = await prisma.mistake.create({
            data: {
                topicId: topicAId,
                questionId: questionAId,
                sessionId: session.id,
                sourceSessionLogId: log.id,
                mistakeText: 'Answered incorrectly',
                correctUnderstanding: 'Review the topic materials for the correct understanding.',
            },
        });
        mistakeIds.push(auto.id);

        const autoPatched = await updateMistake(prisma, auto.id, {
            mistakeText: 'Owner clarified auto mistake',
        });
        assert.equal(autoPatched.mistake.mistakeText, 'Owner clarified auto mistake');
        assert.equal(autoPatched.mistake.sourceSessionLogId, log.id);
        assert.equal(autoPatched.mistake.sessionId, session.id);

        await assert.rejects(
            () =>
                prisma.mistake.create({
                    data: {
                        topicId: topicAId,
                        sourceSessionLogId: log.id,
                        mistakeText: 'dup',
                        correctUnderstanding: 'dup',
                    },
                }),
            (error: unknown) =>
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code: string }).code === 'P2002',
        );

        await prisma.sessionLog.delete({ where: { id: log.id } });
        await prisma.revisionSession.delete({ where: { id: session.id } });
    });
});
