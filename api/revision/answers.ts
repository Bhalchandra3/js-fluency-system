// api/revision/answers.ts
// POST /api/revision/answers — authenticated answer upsert while OPEN.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import { RevisionApiError } from '../_lib/revision/errors.js';
import {
    submitRevisionAnswer as defaultSubmitRevisionAnswer,
    type SubmitAnswerInput,
    type SubmitAnswerResponse,
} from '../_lib/revision/answerService.js';

export type AnswersHandlerDeps = {
    prisma: PrismaClient;
    submitRevisionAnswer: (
        prisma: PrismaClient,
        raw: SubmitAnswerInput,
        now?: Date,
    ) => Promise<SubmitAnswerResponse>;
    now: () => Date;
};

const defaultDeps: AnswersHandlerDeps = {
    prisma: defaultPrisma,
    submitRevisionAnswer: defaultSubmitRevisionAnswer,
    now: () => new Date(),
};

function readBody(req: VercelRequest): SubmitAnswerInput {
    const body = req.body;
    if (body === null || body === undefined) {
        return {} as SubmitAnswerInput;
    }
    if (typeof body === 'string') {
        try {
            return JSON.parse(body) as SubmitAnswerInput;
        } catch {
            throw new RevisionApiError(400, 'Request body must be valid JSON');
        }
    }
    if (typeof body !== 'object') {
        throw new RevisionApiError(400, 'Request body must be a JSON object');
    }
    return body as SubmitAnswerInput;
}

export async function handleRevisionAnswers(
    req: VercelRequest,
    res: VercelResponse,
    deps: AnswersHandlerDeps = defaultDeps,
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
        const payload = await deps.submitRevisionAnswer(
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
    await handleRevisionAnswers(req, res);
}
