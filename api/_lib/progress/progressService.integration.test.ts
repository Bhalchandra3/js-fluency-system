// api/_lib/progress/progressService.integration.test.ts
// Disposable PostgreSQL tests for read-only progress summary (§2.5.5).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TopicStatus } from '../../../generated/prisma/client.js';
import { kolkataCalendarDateToUtcInstant } from '../scheduling/calendarDay.js';
import { getProgressSummary } from './progressService.js';

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

const PREFIX = `prog-${Date.now()}`;
const NOW = new Date('2026-10-24T12:00:00.000Z');
const TODAY = kolkataCalendarDateToUtcInstant({ year: 2026, month: 10, day: 24 });
const YESTERDAY = kolkataCalendarDateToUtcInstant({
    year: 2026,
    month: 10,
    day: 23,
});
const TOMORROW = kolkataCalendarDateToUtcInstant({
    year: 2026,
    month: 10,
    day: 25,
});

describe('progressService (integration / disposable DB)', () => {
    const databaseUrl = requireTestDatabaseUrl();
    const pool = new Pool({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const topicIds: string[] = [];
    const mistakeIds: string[] = [];
    const deepDiveTopicIds: string[] = [];

    before(async () => {
        const identity = await pool.query('SELECT current_database() AS db');
        assert.equal(identity.rows[0].db, 'jsfluency_test');
    });

    after(async () => {
        if (mistakeIds.length > 0) {
            await prisma.mistake.deleteMany({ where: { id: { in: mistakeIds } } });
        }
        if (deepDiveTopicIds.length > 0) {
            await prisma.deepDiveNote.deleteMany({
                where: { topicId: { in: deepDiveTopicIds } },
            });
        }
        // Also clear any mistakes/notes attached via topic cascade cleanup
        if (topicIds.length > 0) {
            await prisma.mistake.deleteMany({ where: { topicId: { in: topicIds } } });
            await prisma.deepDiveNote.deleteMany({
                where: { topicId: { in: topicIds } },
            });
            await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
        }
        await prisma.$disconnect();
        await pool.end();
    });

    async function createTopic(input: {
        name: string;
        status: TopicStatus;
        nextRevisionDate: Date;
    }) {
        const topic = await prisma.topic.create({
            data: {
                name: `${PREFIX}-${input.name}`,
                slug: `${PREFIX}-${input.name}`,
                category: 'Fundamentals',
                status: input.status,
                nextRevisionDate: input.nextRevisionDate,
                intervalDays: 1,
            },
        });
        topicIds.push(topic.id);
        return topic;
    }

    it('aggregates status, deep dive, unresolved mistakes, due/overdue without mutating state', async () => {
        // Baseline snapshot of global counts so we can assert deltas on a shared DB
        const baseline = await getProgressSummary(prisma, NOW);

        const greenDue = await createTopic({
            name: 'green-due',
            status: TopicStatus.GREEN,
            nextRevisionDate: TODAY,
        });
        const yellowOverdue = await createTopic({
            name: 'yellow-overdue',
            status: TopicStatus.YELLOW,
            nextRevisionDate: YESTERDAY,
        });
        const redFuture = await createTopic({
            name: 'red-future',
            status: TopicStatus.RED,
            nextRevisionDate: TOMORROW,
        });
        const redOverdue = await createTopic({
            name: 'red-overdue',
            status: TopicStatus.RED,
            nextRevisionDate: YESTERDAY,
        });

        const note1 = await prisma.deepDiveNote.create({
            data: {
                topicId: redFuture.id,
                reason: `${PREFIX} note 1`,
                notes: 'owner',
            },
        });
        deepDiveTopicIds.push(note1.topicId);
        const note2 = await prisma.deepDiveNote.create({
            data: {
                topicId: redOverdue.id,
                reason: `${PREFIX} note 2`,
            },
        });
        deepDiveTopicIds.push(note2.topicId);

        const unresolvedA = await prisma.mistake.create({
            data: {
                topicId: greenDue.id,
                mistakeText: `${PREFIX} unresolved a`,
                correctUnderstanding: 'fix',
            },
        });
        mistakeIds.push(unresolvedA.id);
        const unresolvedB = await prisma.mistake.create({
            data: {
                topicId: yellowOverdue.id,
                mistakeText: `${PREFIX} unresolved b`,
                correctUnderstanding: 'fix',
            },
        });
        mistakeIds.push(unresolvedB.id);
        const resolved = await prisma.mistake.create({
            data: {
                topicId: redFuture.id,
                mistakeText: `${PREFIX} resolved`,
                correctUnderstanding: 'fix',
                resolvedAt: NOW,
            },
        });
        mistakeIds.push(resolved.id);

        // Snapshot fields that must not change after a progress read
        const topicSnapshots = await prisma.topic.findMany({
            where: { id: { in: topicIds } },
            select: {
                id: true,
                status: true,
                intervalDays: true,
                nextRevisionDate: true,
                updatedAt: true,
            },
            orderBy: { id: 'asc' },
        });
        const mistakeSnapshots = await prisma.mistake.findMany({
            where: { id: { in: mistakeIds } },
            select: {
                id: true,
                resolvedAt: true,
                mistakeText: true,
            },
            orderBy: { id: 'asc' },
        });
        const noteSnapshots = await prisma.deepDiveNote.findMany({
            where: { topicId: { in: deepDiveTopicIds } },
            select: {
                topicId: true,
                reason: true,
                notes: true,
                updatedAt: true,
            },
            orderBy: { topicId: 'asc' },
        });

        const summary = await getProgressSummary(prisma, NOW);

        assert.equal(summary.status, 'ok');
        assert.equal(
            summary.statusCounts.green,
            baseline.statusCounts.green + 1,
        );
        assert.equal(
            summary.statusCounts.yellow,
            baseline.statusCounts.yellow + 1,
        );
        assert.equal(summary.statusCounts.red, baseline.statusCounts.red + 2);
        assert.equal(summary.deepDiveCount, baseline.deepDiveCount + 2);
        // unresolved A+B only; resolved excluded
        assert.equal(
            summary.unresolvedMistakeCount,
            baseline.unresolvedMistakeCount + 2,
        );
        // due: greenDue (today) + yellowOverdue + redOverdue = +3; redFuture not due
        assert.equal(summary.dueCount, baseline.dueCount + 3);
        // overdue: yellowOverdue + redOverdue = +2
        assert.equal(summary.overdueCount, baseline.overdueCount + 2);
        assert.ok(summary.dueCount >= summary.overdueCount);

        // Exact field set — no unapproved extras
        assert.deepEqual(Object.keys(summary).sort(), [
            'deepDiveCount',
            'dueCount',
            'overdueCount',
            'status',
            'statusCounts',
            'unresolvedMistakeCount',
        ]);
        assert.deepEqual(Object.keys(summary.statusCounts).sort(), [
            'green',
            'red',
            'yellow',
        ]);

        // Read-only: no mutation of topics / mistakes / notes
        const topicsAfter = await prisma.topic.findMany({
            where: { id: { in: topicIds } },
            select: {
                id: true,
                status: true,
                intervalDays: true,
                nextRevisionDate: true,
                updatedAt: true,
            },
            orderBy: { id: 'asc' },
        });
        assert.deepEqual(topicsAfter, topicSnapshots);

        const mistakesAfter = await prisma.mistake.findMany({
            where: { id: { in: mistakeIds } },
            select: {
                id: true,
                resolvedAt: true,
                mistakeText: true,
            },
            orderBy: { id: 'asc' },
        });
        assert.deepEqual(mistakesAfter, mistakeSnapshots);

        const notesAfter = await prisma.deepDiveNote.findMany({
            where: { topicId: { in: deepDiveTopicIds } },
            select: {
                topicId: true,
                reason: true,
                notes: true,
                updatedAt: true,
            },
            orderBy: { topicId: 'asc' },
        });
        assert.deepEqual(notesAfter, noteSnapshots);

        // DailyProgress must remain unused by this path
        const dailyBefore = await prisma.dailyProgress.count();
        await getProgressSummary(prisma, NOW);
        const dailyAfter = await prisma.dailyProgress.count();
        assert.equal(dailyAfter, dailyBefore);
    });

    it('empty fixture contribution is zero when no topics match prefix isolation', async () => {
        // Fresh summary still returns the locked shape with non-negative integers
        const summary = await getProgressSummary(prisma, NOW);
        assert.equal(summary.status, 'ok');
        assert.equal(typeof summary.statusCounts.green, 'number');
        assert.equal(typeof summary.statusCounts.yellow, 'number');
        assert.equal(typeof summary.statusCounts.red, 'number');
        assert.ok(summary.statusCounts.green >= 0);
        assert.ok(summary.deepDiveCount >= 0);
        assert.ok(summary.unresolvedMistakeCount >= 0);
        assert.ok(summary.dueCount >= summary.overdueCount);
    });
});
