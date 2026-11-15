// api\_lib\auth.ts

import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BEARER_TOKEN_ENV = 'BEARER_TOKEN';

function timingSafeTokenMatch(provided: string, expected: string): boolean {
    const bufProvided = Buffer.from(provided);
    const bufExpected = Buffer.from(expected);

    if (bufProvided.length !== bufExpected.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufProvided, bufExpected);
}

export function requireBearerToken(
    req: VercelRequest,
    res: VercelResponse,
): boolean {
    const expectedToken = process.env[BEARER_TOKEN_ENV];

    if (!expectedToken) {
        res.status(500).json({
            status: 'error',
            message: 'Server authentication is not configured',
        });

        return false;
    }

    const authorization = req.headers.authorization;

    if (!authorization) {
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
        });

        return false;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token || !timingSafeTokenMatch(token, expectedToken)) {
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
        });

        return false;
    }

    return true;
}
