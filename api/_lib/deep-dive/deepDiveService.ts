// api/_lib/deep-dive/deepDiveService.ts
// Deep Dive Queue read/write services (Phase 4 Step 6 — §2.5.5).

import type { PrismaClient, TopicStatus } from '../../../generated/prisma/client.js';
import { DeepDiveApiError } from './errors.js';

type DbClient = PrismaClient;

const PATCH_ALLOWED = new Set(['reason', 'notes']);

const PATCH_FORBIDDEN = new Set([
    'id',
    'topicId',
    'createdAt',
    'updatedAt',
    'topic',
]);

export type DeepDiveTopicDto = {
    id: string;
    name: string;
    slug: string;
    status: TopicStatus;
};

export type DeepDiveNoteDto = {
    id: string;
    topicId: string;
    reason: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    topic: DeepDiveTopicDto;
};

export type ListDeepDiveResponse = {
    status: 'ok';
    notes: DeepDiveNoteDto[];
};

export type DeepDiveNoteResponse = {
    status: 'ok';
    note: DeepDiveNoteDto;
};

export type DeleteDeepDiveResponse = {
    status: 'ok';
};

function requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new DeepDiveApiError(400, `${field} must be a non-empty string`);
    }
    return value.trim();
}

function singleQueryValue(value: unknown): unknown {
    return Array.isArray(value) ? value[0] : value;
}

function assertObjectBody(raw: unknown): Record<string, unknown> {
    if (raw === null || raw === undefined) {
        throw new DeepDiveApiError(400, 'Request body must be a JSON object');
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new DeepDiveApiError(400, 'Request body must be a JSON object');
    }
    return raw as Record<string, unknown>;
}

function rejectUnknownAndForbidden(
    body: Record<string, unknown>,
    allowed: Set<string>,
    forbidden: Set<string>,
): void {
    for (const key of Object.keys(body)) {
        if (forbidden.has(key)) {
            throw new DeepDiveApiError(
                400,
                `${key} cannot be set through this endpoint`,
            );
        }
        if (!allowed.has(key)) {
            throw new DeepDiveApiError(400, `Unknown field: ${key}`);
        }
    }
}

function toDto(row: {
    id: string;
    topicId: string;
    reason: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    topic: {
        id: string;
        name: string;
        slug: string;
        status: TopicStatus;
    };
}): DeepDiveNoteDto {
    return {
        id: row.id,
        topicId: row.topicId,
        reason: row.reason,
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        topic: {
            id: row.topic.id,
            name: row.topic.name,
            slug: row.topic.slug,
            status: row.topic.status,
        },
    };
}

const topicSelect = {
    id: true,
    name: true,
    slug: true,
    status: true,
} as const;

/**
 * List Deep Dive notes: RED topics first, then updatedAt descending within groups.
 * No pagination in §2.5.5.
 */
export async function listDeepDiveNotes(
    prisma: DbClient,
): Promise<ListDeepDiveResponse> {
    const rows = await prisma.deepDiveNote.findMany({
        include: { topic: { select: topicSelect } },
    });

    rows.sort((a, b) => {
        const aRed = a.topic.status === 'RED' ? 0 : 1;
        const bRed = b.topic.status === 'RED' ? 0 : 1;
        if (aRed !== bRed) {
            return aRed - bRed;
        }
        return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return {
        status: 'ok',
        notes: rows.map(toDto),
    };
}

export async function updateDeepDiveNote(
    prisma: DbClient,
    topicIdRaw: unknown,
    raw: unknown,
): Promise<DeepDiveNoteResponse> {
    const topicId = requireNonEmptyString(singleQueryValue(topicIdRaw), 'topicId');
    const body = assertObjectBody(raw);
    rejectUnknownAndForbidden(body, PATCH_ALLOWED, PATCH_FORBIDDEN);

    if (Object.keys(body).length === 0) {
        throw new DeepDiveApiError(
            400,
            'Request body must include at least one field',
        );
    }

    const existing = await prisma.deepDiveNote.findUnique({
        where: { topicId },
        select: { id: true },
    });
    if (!existing) {
        throw new DeepDiveApiError(404, 'Deep Dive note not found');
    }

    const data: { reason?: string; notes?: string | null } = {};

    if ('reason' in body) {
        data.reason = requireNonEmptyString(body['reason'], 'reason');
    }
    if ('notes' in body) {
        // Allow null to clear owner notes; strings may be empty.
        if (body['notes'] === null) {
            data.notes = null;
        } else if (typeof body['notes'] === 'string') {
            data.notes = body['notes'];
        } else {
            throw new DeepDiveApiError(400, 'notes must be a string or null');
        }
    }

    const updated = await prisma.deepDiveNote.update({
        where: { topicId },
        data,
        include: { topic: { select: topicSelect } },
    });

    return { status: 'ok', note: toDto(updated) };
}

/**
 * Explicit remove-from-queue. Does not mutate Topic.status or schedule fields.
 */
export async function deleteDeepDiveNote(
    prisma: DbClient,
    topicIdRaw: unknown,
): Promise<DeleteDeepDiveResponse> {
    const topicId = requireNonEmptyString(singleQueryValue(topicIdRaw), 'topicId');

    const existing = await prisma.deepDiveNote.findUnique({
        where: { topicId },
        select: { id: true },
    });
    if (!existing) {
        throw new DeepDiveApiError(404, 'Deep Dive note not found');
    }

    await prisma.deepDiveNote.delete({
        where: { topicId },
    });

    return { status: 'ok' };
}
