// api/revision/complete.ts
// POST /api/revision/complete — authenticated explicit session finalization.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import { RevisionApiError } from '../_lib/revision/errors.js';
import {
    completeRevisionSession as defaultCompleteRevisionSession,
    type CompleteSessionInput,
    type CompleteSessionResponse,
} from '../_lib/revision/completeService.js';

export type CompleteHandlerDeps = {
    prisma: PrismaClient;
    completeRevisionSession: (
        prisma: PrismaClient,
        raw: CompleteSessionInput,
        now?: Date,
    ) => Promise<CompleteSessionResponse>;
    now: () => Date;
};

const defaultDeps: CompleteHandlerDeps = {
    prisma: defaultPrisma,
    completeRevisionSession: defaultCompleteRevisionSession,
    now: () => new Date(),
};

function readBody(req: VercelRequest): CompleteSessionInput {
    const body = req.body;
    if (body === null || body === undefined) {
        return {} as CompleteSessionInput;
    }
    if (typeof body === 'string') {
        try {
            return JSON.parse(body) as CompleteSessionInput;
        } catch {
            throw new RevisionApiError(400, 'Request body must be valid JSON');
        }
    }
    if (typeof body !== 'object') {
        throw new RevisionApiError(400, 'Request body must be a JSON object');
    }
    return body as CompleteSessionInput;
}

export async function handleRevisionComplete(
    req: VercelRequest,
    res: VercelResponse,
    deps: CompleteHandlerDeps = defaultDeps,
): Promise<void> {
    if (!requireBearerToken(req, res)) {
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({
            status: 'error',
            message: 'Method not allowed',
        });
        return;
    }

    try {
        const payload = await deps.completeRevisionSession(
            deps.prisma,
            readBody(req),
            deps.now(),
        );
        res.status(200).json(payload);
    } catch (error) {
        if (error instanceof RevisionApiError) {
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
    await handleRevisionComplete(req, res);
}
