// api/_lib/deep-dive/deepDiveService.integration.test.ts
// Disposable PostgreSQL tests for Deep Dive Queue services (§2.5.5).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    PrismaClient,
    RevisionSessionOutcome,
    TopicStatus,
} from '../../../generated/prisma/client.js';
import { ensureDeepDiveNote } from '../revision/completeSideEffects.js';
import { DeepDiveApiError } from './errors.js';
import {
    deleteDeepDiveNote,
    listDeepDiveNotes,
    updateDeepDiveNote,
} from './deepDiveService.js';

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

const PREFIX = `dd-api-${Date.now()}`;

describe('deepDiveService (integration / disposable DB)', () => {
    const databaseUrl = requireTestDatabaseUrl();
    const pool = new Pool({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    let redTopicId = '';
    let greenTopicId = '';
    let yellowTopicId = '';
    let otherTopicId = '';

    before(async () => {
        const identity = await pool.query(
            'SELECT current_database() AS db',
        );
        assert.equal(identity.rows[0].db, 'jsfluency_test');

        const red = await prisma.topic.create({
            data: {
                name: `${PREFIX}-red`,
                slug: `${PREFIX}-red`,
                category: 'Fundamentals',
                status: TopicStatus.RED,
            },
        });
        const green = await prisma.topic.create({
            data: {
                name: `${PREFIX}-green`,
                slug: `${PREFIX}-green`,
                category: 'Fundamentals',
                status: TopicStatus.GREEN,
            },
        });
        const yellow = await prisma.topic.create({
            data: {
                name: `${PREFIX}-yellow`,
                slug: `${PREFIX}-yellow`,
                category: 'Fundamentals',
                status: TopicStatus.YELLOW,
            },
        });
        const other = await prisma.topic.create({
            data: {
                name: `${PREFIX}-other`,
                slug: `${PREFIX}-other`,
                category: 'Fundamentals',
                status: TopicStatus.RED,
            },
        });
        redTopicId = red.id;
        greenTopicId = green.id;
        yellowTopicId = yellow.id;
        otherTopicId = other.id;
    });

    after(async () => {
        const topicIds = [redTopicId, greenTopicId, yellowTopicId, otherTopicId].filter(
            Boolean,
        );
        if (topicIds.length > 0) {
            await prisma.deepDiveNote.deleteMany({
                where: { topicId: { in: topicIds } },
            });
            await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
        }
        await prisma.$disconnect();
        await pool.end();
    });

    it('list order, patch preserve/omit, delete explicit, ensure does not overwrite', async () => {
        const empty = await listDeepDiveNotes(prisma);
        assert.equal(empty.status, 'ok');
        const beforeCount = empty.notes.filter((n) =>
            n.topic.slug.startsWith(PREFIX),
        ).length;
        assert.equal(beforeCount, 0);

        // Create notes with staggered updatedAt via sequential updates
        await prisma.deepDiveNote.create({
            data: {
                topicId: greenTopicId,
                reason: 'Green older',
                notes: null,
                updatedAt: new Date('2026-10-20T10:00:00.000Z'),
                createdAt: new Date('2026-10-20T10:00:00.000Z'),
            },
        });
        await prisma.deepDiveNote.create({
            data: {
                topicId: yellowTopicId,
                reason: 'Yellow newer among non-red',
                notes: 'y-notes',
                updatedAt: new Date('2026-10-22T10:00:00.000Z'),
                createdAt: new Date('2026-10-21T10:00:00.000Z'),
            },
        });
        await prisma.deepDiveNote.create({
            data: {
                topicId: redTopicId,
                reason: 'Red older',
                notes: null,
                updatedAt: new Date('2026-10-19T10:00:00.000Z'),
                createdAt: new Date('2026-10-19T10:00:00.000Z'),
            },
        });
        await prisma.deepDiveNote.create({
            data: {
                topicId: otherTopicId,
                reason: 'Red newer',
                notes: 'keep-me',
                updatedAt: new Date('2026-10-23T10:00:00.000Z'),
                createdAt: new Date('2026-10-23T10:00:00.000Z'),
            },
        });

        // Force updatedAt via raw SQL because Prisma @updatedAt may override on create
        await prisma.$executeRaw`
            UPDATE "DeepDiveNote" SET "updatedAt" = ${new Date('2026-10-20T10:00:00.000Z')}
            WHERE "topicId" = ${greenTopicId}
        `;
        await prisma.$executeRaw`
            UPDATE "DeepDiveNote" SET "updatedAt" = ${new Date('2026-10-22T10:00:00.000Z')}
            WHERE "topicId" = ${yellowTopicId}
        `;
        await prisma.$executeRaw`
            UPDATE "DeepDiveNote" SET "updatedAt" = ${new Date('2026-10-19T10:00:00.000Z')}
            WHERE "topicId" = ${redTopicId}
        `;
        await prisma.$executeRaw`
            UPDATE "DeepDiveNote" SET "updatedAt" = ${new Date('2026-10-23T10:00:00.000Z')}
            WHERE "topicId" = ${otherTopicId}
        `;

        const listed = await listDeepDiveNotes(prisma);
        const ours = listed.notes.filter((n) => n.topic.slug.startsWith(PREFIX));
        assert.equal(ours.length, 4);

        // RED first (both red topics before green/yellow), then updatedAt desc within groups
        assert.equal(ours[0]!.topic.status, 'RED');
        assert.equal(ours[1]!.topic.status, 'RED');
        assert.equal(ours[0]!.topicId, otherTopicId); // newer RED
        assert.equal(ours[1]!.topicId, redTopicId); // older RED
        assert.ok(ours[2]!.topic.status !== 'RED');
        assert.ok(ours[3]!.topic.status !== 'RED');
        assert.equal(ours[2]!.topicId, yellowTopicId); // newer non-RED
        assert.equal(ours[3]!.topicId, greenTopicId); // older non-RED

        // PATCH: update reason only — notes preserved
        const patchedReason = await updateDeepDiveNote(prisma, otherTopicId, {
            reason: 'Owner revised reason',
        });
        assert.equal(patchedReason.note.reason, 'Owner revised reason');
        assert.equal(patchedReason.note.notes, 'keep-me');
        assert.equal(patchedReason.note.topic.status, 'RED');

        // PATCH: clear notes with null; reason preserved
        const cleared = await updateDeepDiveNote(prisma, otherTopicId, {
            notes: null,
        });
        assert.equal(cleared.note.notes, null);
        assert.equal(cleared.note.reason, 'Owner revised reason');

        // PATCH: restore notes
        await updateDeepDiveNote(prisma, otherTopicId, {
            notes: 'restored notes',
        });

        await assert.rejects(
            () => updateDeepDiveNote(prisma, otherTopicId, {}),
            (error: unknown) =>
                error instanceof DeepDiveApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () =>
                updateDeepDiveNote(prisma, otherTopicId, {
                    topicId: redTopicId,
                }),
            (error: unknown) =>
                error instanceof DeepDiveApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () =>
                updateDeepDiveNote(prisma, otherTopicId, {
                    reason: '   ',
                }),
            (error: unknown) =>
                error instanceof DeepDiveApiError && error.statusCode === 400,
        );
        await assert.rejects(
            () =>
                updateDeepDiveNote(prisma, 'missing-topic', {
                    reason: 'x',
                }),
            (error: unknown) =>
                error instanceof DeepDiveApiError && error.statusCode === 404,
        );

        // Step 4 ensure must not overwrite owner reason/notes
        const ensured = await ensureDeepDiveNote(
            prisma,
            otherTopicId,
            RevisionSessionOutcome.RESET,
        );
        assert.equal(ensured, false);
        const afterEnsure = await prisma.deepDiveNote.findUniqueOrThrow({
            where: { topicId: otherTopicId },
        });
        assert.equal(afterEnsure.reason, 'Owner revised reason');
        assert.equal(afterEnsure.notes, 'restored notes');

        // Topic status/schedule unchanged by ensure when note exists — already RED
        const topicBeforeDelete = await prisma.topic.findUniqueOrThrow({
            where: { id: otherTopicId },
        });
        assert.equal(topicBeforeDelete.status, 'RED');
        const intervalBefore = topicBeforeDelete.intervalDays;
        const nextBefore = topicBeforeDelete.nextRevisionDate.toISOString();

        // DELETE explicit — only that topic's note
        const deleted = await deleteDeepDiveNote(prisma, otherTopicId);
        assert.deepEqual(deleted, { status: 'ok' });
        assert.equal(
            await prisma.deepDiveNote.count({ where: { topicId: otherTopicId } }),
            0,
        );
        assert.equal(
            await prisma.deepDiveNote.count({ where: { topicId: redTopicId } }),
            1,
        );

        const topicAfterDelete = await prisma.topic.findUniqueOrThrow({
            where: { id: otherTopicId },
        });
        assert.equal(topicAfterDelete.status, topicBeforeDelete.status);
        assert.equal(topicAfterDelete.intervalDays, intervalBefore);
        assert.equal(
            topicAfterDelete.nextRevisionDate.toISOString(),
            nextBefore,
        );

        // Repeated DELETE → 404
        await assert.rejects(
            () => deleteDeepDiveNote(prisma, otherTopicId),
            (error: unknown) =>
                error instanceof DeepDiveApiError && error.statusCode === 404,
        );

        // After explicit delete, Step 4 ensure can recreate (no tombstone)
        const reEnsured = await ensureDeepDiveNote(
            prisma,
            otherTopicId,
            RevisionSessionOutcome.RESET,
        );
        assert.equal(reEnsured, true);
        const recreated = await prisma.deepDiveNote.findUniqueOrThrow({
            where: { topicId: otherTopicId },
        });
        assert.match(recreated.reason, /\[phase4-status-v1\] Session RESET/);
        assert.equal(recreated.notes, null);
    });
});
