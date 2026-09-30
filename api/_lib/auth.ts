// api\_lib\auth.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';

const BEARER_TOKEN_ENV = 'BEARER_TOKEN';

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

    if (scheme !== 'Bearer' || !token || token !== expectedToken) {
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
        });

        return false;
    }

    return true;
}