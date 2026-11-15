/**
 * Destructive: wipe learning activity + all questions; reset topic schedule fields.
 * Does NOT seed — run `npx prisma db seed` after.
 *
 * Usage:
 *   npx tsx scripts/fresh-start-learning-data.ts --i-understand-destructive
 *
 * Requires DATABASE_URL. Never logs the full connection string.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const confirmed = process.argv.includes('--i-understand-destructive');
if (!confirmed) {
  console.error('Refusing: pass --i-understand-destructive to wipe learning data + questions.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

function dbIdentity(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const db = u.pathname.replace(/^\//, '') || '(none)';
    return { host, database: db, protocol: u.protocol.replace(':', '') };
  } catch {
    return { host: '(unparseable)', database: '(unparseable)', protocol: '?' };
  }
}

const identity = dbIdentity(process.env.DATABASE_URL);
console.log(JSON.stringify({ phase: 'pre-wipe', identity }, null, 2));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function counts() {
  const [mistakes, deepDive, daily, logs, sessions, sessionQuestions, questions, topics] =
    await Promise.all([
      prisma.mistake.count(),
      prisma.deepDiveNote.count(),
      prisma.dailyProgress.count(),
      prisma.sessionLog.count(),
      prisma.revisionSession.count(),
      prisma.revisionSessionQuestion.count(),
      prisma.question.count(),
      prisma.topic.count(),
    ]);
  return { mistakes, deepDive, daily, logs, sessions, sessionQuestions, questions, topics };
}

async function main() {
  const before = await counts();
  console.log(JSON.stringify({ phase: 'counts-before', before }, null, 2));

  // FK-safe order
  const delMistakes = await prisma.mistake.deleteMany({});
  const delDeep = await prisma.deepDiveNote.deleteMany({});
  const delDaily = await prisma.dailyProgress.deleteMany({});
  const delSessions = await prisma.revisionSession.deleteMany({}); // cascades logs + sessionQuestions
  const delLogs = await prisma.sessionLog.deleteMany({}); // leftover practice logs if any
  const delQuestions = await prisma.question.deleteMany({});

  const reset = await prisma.topic.updateMany({
    data: {
      status: 'RED',
      intervalDays: 1,
      nextRevisionDate: new Date(),
    },
  });

  const after = await counts();
  console.log(
    JSON.stringify(
      {
        phase: 'post-wipe',
        deleted: {
          mistakes: delMistakes.count,
          deepDive: delDeep.count,
          daily: delDaily.count,
          sessions: delSessions.count,
          leftoverLogs: delLogs.count,
          questions: delQuestions.count,
          topicsReset: reset.count,
        },
        after,
        identity,
      },
      null,
      2,
    ),
  );

  if (after.questions !== 0 || after.sessions !== 0 || after.mistakes !== 0 || after.deepDive !== 0) {
    throw new Error('Wipe incomplete — unexpected remaining rows');
  }
}

main()
  .catch((err) => {
    console.error('Fresh-start wipe failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
