// api/_lib/mistakes/mistakeService.ts
// Mistake Log read/write services (Phase 4 Step 5 — §2.5.5).

import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { MistakeApiError } from './errors.js';

type DbClient = PrismaClient;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const CREATE_ALLOWED = new Set([
    'topicId',
    'mistakeText',
    'correctUnderstanding',
    'questionId',
]);

const CREATE_FORBIDDEN = new Set([
    'sourceSessionLogId',
    'sessionId',
    'id',
    'resolvedAt',
    'turnedIntoQuestion',
    'createdAt',
]);

const PATCH_ALLOWED = new Set([
    'mistakeText',
    'correctUnderstanding',
    'turnedIntoQuestion',
    'resolved',
]);

const PATCH_FORBIDDEN = new Set([
    'sourceSessionLogId',
    'sessionId',
    'questionId',
    'topicId',
    'id',
    'resolvedAt',
    'createdAt',
]);

export type MistakeListItemDto = {
    id: string;
    topicId: string;
    questionId: string | null;
    sessionId: string | null;
    sourceSessionLogId: string | null;
    mistakeText: string;
    correctUnderstanding: string;
    turnedIntoQuestion: boolean;
    resolvedAt: string | null;
    createdAt: string;
};

export type MistakeDetailDto = MistakeListItemDto & {
    topic: { id: string; name: string; slug: string };
};

export type ListMistakesResponse = {
    status: 'ok';
    mistakes: MistakeListItemDto[];
    total: number;
};

export type MistakeDetailResponse = {
    status: 'ok';
    mistake: MistakeDetailDto;
};

export type ListMistakesQuery = {
    topicId?: unknown;
    unresolvedOnly?: unknown;
    limit?: unknown;
    offset?: unknown;
};

function requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new MistakeApiError(400, `${field} must be a non-empty string`);
    }
    return value.trim();
}

function optionalNonEmptyString(
    value: unknown,
    field: string,
): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    return requireNonEmptyString(value, field);
}

function parseNonNegativeInt(
    value: unknown,
    field: string,
    fallback: number,
): number {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw === 'number') {
        if (!Number.isInteger(raw) || raw < 0) {
            throw new MistakeApiError(
                400,
                `${field} must be a non-negative integer`,
            );
        }
        return raw;
    }
    if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) {
        throw new MistakeApiError(400, `${field} must be a non-negative integer`);
    }
    const n = Number(raw.trim());
    if (!Number.isInteger(n) || n < 0) {
        throw new MistakeApiError(400, `${field} must be a non-negative integer`);
    }
    return n;
}

function parseLimit(value: unknown): number {
    const limit = parseNonNegativeInt(value, 'limit', DEFAULT_LIMIT);
    if (limit < 1) {
        throw new MistakeApiError(400, 'limit must be between 1 and 200');
    }
    if (limit > MAX_LIMIT) {
        throw new MistakeApiError(400, 'limit must be between 1 and 200');
    }
    return limit;
}

function parseUnresolvedOnly(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
        return false;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === true || raw === 'true') {
        return true;
    }
    if (raw === false || raw === 'false') {
        return false;
    }
    throw new MistakeApiError(
        400,
        'unresolvedOnly must be true or false when provided',
    );
}

function singleQueryValue(value: unknown): unknown {
    return Array.isArray(value) ? value[0] : value;
}

function assertObjectBody(raw: unknown): Record<string, unknown> {
    if (raw === null || raw === undefined) {
        throw new MistakeApiError(400, 'Request body must be a JSON object');
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new MistakeApiError(400, 'Request body must be a JSON object');
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
            throw new MistakeApiError(
                400,
                `${key} cannot be set through this endpoint`,
            );
        }
        if (!allowed.has(key)) {
            throw new MistakeApiError(400, `Unknown field: ${key}`);
        }
    }
}

function toListItem(row: {
    id: string;
    topicId: string;
    questionId: string | null;
    sessionId: string | null;
    sourceSessionLogId: string | null;
    mistakeText: string;
    correctUnderstanding: string;
    turnedIntoQuestion: boolean;
    resolvedAt: Date | null;
    createdAt: Date;
}): MistakeListItemDto {
    return {
        id: row.id,
        topicId: row.topicId,
        questionId: row.questionId,
        sessionId: row.sessionId,
        sourceSessionLogId: row.sourceSessionLogId,
        mistakeText: row.mistakeText,
        correctUnderstanding: row.correctUnderstanding,
        turnedIntoQuestion: row.turnedIntoQuestion,
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
    };
}

function toDetail(row: {
    id: string;
    topicId: string;
    questionId: string | null;
    sessionId: string | null;
    sourceSessionLogId: string | null;
    mistakeText: string;
    correctUnderstanding: string;
    turnedIntoQuestion: boolean;
    resolvedAt: Date | null;
    createdAt: Date;
    topic: { id: string; name: string; slug: string };
}): MistakeDetailDto {
    return {
        ...toListItem(row),
        topic: {
            id: row.topic.id,
            name: row.topic.name,
            slug: row.topic.slug,
        },
    };
}

const detailInclude = {
    topic: { select: { id: true, name: true, slug: true } },
} as const;

export async function listMistakes(
    prisma: DbClient,
    query: ListMistakesQuery,
): Promise<ListMistakesResponse> {
    const topicIdRaw = singleQueryValue(query.topicId);
    const topicId =
        topicIdRaw === undefined || topicIdRaw === null || topicIdRaw === ''
            ? undefined
            : requireNonEmptyString(topicIdRaw, 'topicId');
    const unresolvedOnly = parseUnresolvedOnly(
        singleQueryValue(query.unresolvedOnly),
    );
    const limit = parseLimit(singleQueryValue(query.limit));
    const offset = parseNonNegativeInt(singleQueryValue(query.offset), 'offset', 0);

    const where: Prisma.MistakeWhereInput = {};
    if (topicId !== undefined) {
        where.topicId = topicId;
    }
    if (unresolvedOnly) {
        where.resolvedAt = null;
    }

    const [total, rows] = await Promise.all([
        prisma.mistake.count({ where }),
        prisma.mistake.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
    ]);

    return {
        status: 'ok',
        mistakes: rows.map(toListItem),
        total,
    };
}

export async function getMistakeById(
    prisma: DbClient,
    idRaw: unknown,
): Promise<MistakeDetailResponse> {
    const id = requireNonEmptyString(singleQueryValue(idRaw), 'id');

    const row = await prisma.mistake.findUnique({
        where: { id },
        include: detailInclude,
    });
    if (!row) {
        throw new MistakeApiError(404, 'Mistake not found');
    }

    return { status: 'ok', mistake: toDetail(row) };
}

export async function createMistake(
    prisma: DbClient,
    raw: unknown,
): Promise<MistakeDetailResponse> {
    const body = assertObjectBody(raw);
    rejectUnknownAndForbidden(body, CREATE_ALLOWED, CREATE_FORBIDDEN);

    const topicId = requireNonEmptyString(body['topicId'], 'topicId');
    const mistakeText = requireNonEmptyString(body['mistakeText'], 'mistakeText');
    const correctUnderstanding = requireNonEmptyString(
        body['correctUnderstanding'],
        'correctUnderstanding',
    );
    const questionId = optionalNonEmptyString(body['questionId'], 'questionId');

    const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true },
    });
    if (!topic) {
        throw new MistakeApiError(404, 'Topic not found');
    }

    if (questionId !== undefined) {
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: { id: true, topicId: true },
        });
        if (!question) {
            throw new MistakeApiError(404, 'Question not found');
        }
        if (question.topicId !== topicId) {
            throw new MistakeApiError(
                400,
                'questionId must belong to the given topicId',
            );
        }
    }

    const created = await prisma.mistake.create({
        data: {
            topicId,
            mistakeText,
            correctUnderstanding,
            questionId: questionId ?? null,
            // Manual create: never set sessionId / sourceSessionLogId
            sessionId: null,
            sourceSessionLogId: null,
            turnedIntoQuestion: false,
            resolvedAt: null,
        },
        include: detailInclude,
    });

    return { status: 'ok', mistake: toDetail(created) };
}

export async function updateMistake(
    prisma: DbClient,
    idRaw: unknown,
    raw: unknown,
    now: Date = new Date(),
): Promise<MistakeDetailResponse> {
    const id = requireNonEmptyString(singleQueryValue(idRaw), 'id');
    const body = assertObjectBody(raw);
    rejectUnknownAndForbidden(body, PATCH_ALLOWED, PATCH_FORBIDDEN);

    if (Object.keys(body).length === 0) {
        throw new MistakeApiError(400, 'Request body must include at least one field');
    }

    const existing = await prisma.mistake.findUnique({
        where: { id },
        select: { id: true, resolvedAt: true },
    });
    if (!existing) {
        throw new MistakeApiError(404, 'Mistake not found');
    }

    const data: Prisma.MistakeUpdateInput = {};

    if ('mistakeText' in body) {
        data.mistakeText = requireNonEmptyString(body['mistakeText'], 'mistakeText');
    }
    if ('correctUnderstanding' in body) {
        data.correctUnderstanding = requireNonEmptyString(
            body['correctUnderstanding'],
            'correctUnderstanding',
        );
    }
    if ('turnedIntoQuestion' in body) {
        if (typeof body['turnedIntoQuestion'] !== 'boolean') {
            throw new MistakeApiError(
                400,
                'turnedIntoQuestion must be a boolean',
            );
        }
        data.turnedIntoQuestion = body['turnedIntoQuestion'];
    }
    if ('resolved' in body) {
        if (typeof body['resolved'] !== 'boolean') {
            throw new MistakeApiError(400, 'resolved must be a boolean');
        }
        if (body['resolved'] === true) {
            // Idempotent re-resolve: keep existing timestamp when already resolved.
            if (existing.resolvedAt === null) {
                data.resolvedAt = now;
            }
        } else {
            data.resolvedAt = null;
        }
    }

    const updated = await prisma.mistake.update({
        where: { id },
        data,
        include: detailInclude,
    });

    return { status: 'ok', mistake: toDetail(updated) };
}
