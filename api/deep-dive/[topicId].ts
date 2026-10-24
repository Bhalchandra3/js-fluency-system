// api/deep-dive/[topicId].ts
// PATCH /api/deep-dive/:topicId — update reason/notes
// DELETE /api/deep-dive/:topicId — remove from queue (does not change Topic schedule/status)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import { DeepDiveApiError } from '../_lib/deep-dive/errors.js';
import {
    deleteDeepDiveNote as defaultDeleteDeepDiveNote,
    updateDeepDiveNote as defaultUpdateDeepDiveNote,
    type DeepDiveNoteResponse,
    type DeleteDeepDiveResponse,
} from '../_lib/deep-dive/deepDiveService.js';

export type DeepDiveByTopicHandlerDeps = {
    prisma: PrismaClient;
    updateDeepDiveNote: (
        prisma: PrismaClient,
        topicId: unknown,
        raw: unknown,
    ) => Promise<DeepDiveNoteResponse>;
    deleteDeepDiveNote: (
        prisma: PrismaClient,
        topicId: unknown,
    ) => Promise<DeleteDeepDiveResponse>;
};

const defaultDeps: DeepDiveByTopicHandlerDeps = {
    prisma: defaultPrisma,
    updateDeepDiveNote: defaultUpdateDeepDiveNote,
    deleteDeepDiveNote: defaultDeleteDeepDiveNote,
};

function readBody(req: VercelRequest): unknown {
    const body = req.body;
    if (body === null || body === undefined) {
        return {};
    }
    if (typeof body === 'string') {
        try {
            return JSON.parse(body) as unknown;
        } catch {
            throw new DeepDiveApiError(400, 'Request body must be valid JSON');
        }
    }
    if (typeof body !== 'object') {
        throw new DeepDiveApiError(400, 'Request body must be a JSON object');
    }
    return body;
}

function readTopicId(req: VercelRequest): unknown {
    return req.query?.['topicId'];
}

export async function handleDeepDiveByTopic(
    req: VercelRequest,
    res: VercelResponse,
    deps: DeepDiveByTopicHandlerDeps = defaultDeps,
): Promise<void> {
    if (!requireBearerToken(req, res)) {
        return;
    }

    try {
        if (req.method === 'PATCH') {
            const payload = await deps.updateDeepDiveNote(
                deps.prisma,
                readTopicId(req),
                readBody(req),
            );
            res.status(200).json(payload);
            return;
        }

        if (req.method === 'DELETE') {
            const payload = await deps.deleteDeepDiveNote(
                deps.prisma,
                readTopicId(req),
            );
            res.status(200).json(payload);
            return;
        }

        res.status(405).json({
            status: 'error',
            message: 'Method not allowed',
        });
    } catch (error) {
        if (error instanceof DeepDiveApiError) {
            res.status(error.statusCode).json({
                status: 'error',
                message: error.message,
            });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'unknown error',
        });
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
): Promise<void> {
    await handleDeepDiveByTopic(req, res);
}
