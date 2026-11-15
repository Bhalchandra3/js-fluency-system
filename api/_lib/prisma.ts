// api\_lib\prisma.ts

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../generated/prisma/client.js';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pgPool: Pool | undefined;
};

const connectionString = process.env['DATABASE_URL'] || '';

const pool =
    globalForPrisma.pgPool ??
    new Pool({
        connectionString,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter });

// Always cache on globalThis across all environments to reuse in warm serverless containers
globalForPrisma.prisma = prisma;
globalForPrisma.pgPool = pool;
