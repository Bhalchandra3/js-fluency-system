// scripts/backup-db.ts
// Exports all core database tables into a timestamped, sanitized JSON file in backups/

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../api/_lib/prisma.js';

async function backupDatabase() {
    console.log('Starting JavaScript Fluency System database backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupsDir = path.resolve(process.cwd(), 'backups');

    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    const backupFile = path.join(backupsDir, `backup-${timestamp}.json`);

    try {
        const [
            topics,
            questions,
            revisionSessions,
            revisionSessionQuestions,
            sessionLogs,
            mistakes,
            deepDiveNotes,
        ] = await Promise.all([
            prisma.topic.findMany({ orderBy: { id: 'asc' } }),
            prisma.question.findMany({ orderBy: { id: 'asc' } }),
            prisma.revisionSession.findMany({ orderBy: { id: 'asc' } }),
            prisma.revisionSessionQuestion.findMany({ orderBy: { id: 'asc' } }),
            prisma.sessionLog.findMany({ orderBy: { id: 'asc' } }),
            prisma.mistake.findMany({ orderBy: { id: 'asc' } }),
            prisma.deepDiveNote.findMany({ orderBy: { id: 'asc' } }),
        ]);

        const backupData = {
            metadata: {
                system: 'JavaScript Fluency System',
                createdAt: new Date().toISOString(),
                schemaVersion: 'phase5-v1',
                counts: {
                    topics: topics.length,
                    questions: questions.length,
                    revisionSessions: revisionSessions.length,
                    revisionSessionQuestions: revisionSessionQuestions.length,
                    sessionLogs: sessionLogs.length,
                    mistakes: mistakes.length,
                    deepDiveNotes: deepDiveNotes.length,
                },
            },
            data: {
                topics,
                questions,
                revisionSessions,
                revisionSessionQuestions,
                sessionLogs,
                mistakes,
                deepDiveNotes,
            },
        };

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');

        console.log(`\nBackup successfully created: ${backupFile}`);
        console.log('Summary of exported tables:');
        console.table(backupData.metadata.counts);
    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

void backupDatabase();
