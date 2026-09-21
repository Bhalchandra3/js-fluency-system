import { PrismaClient } from '@prisma/client';

// Prevents creating a new PrismaClient on every serverless invocation / hot reload —
// reuses one instance across calls, which avoids exhausting Neon's connection limit.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}