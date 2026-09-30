import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    Prisma,
    PrismaClient,
    QuestionFormat,
    SessionType,
} from '../generated/prisma/client.js';

type TopicSeed = {
    name: string;
    slug: string;
    area: string;
    category: string;
};

type QuestionSeed = {
    topicSlug: string;
    sessionType: SessionType;
    format: QuestionFormat;
    prompt: string;
    options?: string[];
    correctAnswer?: string | null;
    explanation?: string | null;
    codeSnippet?: string | null;
};

const seedDataDir = resolve(process.cwd(), 'prisma', 'seed-data');
const topicsPath = resolve(seedDataDir, 'topics.json');
const questionsPath = resolve(seedDataDir, 'questions.json');

const SESSION_TYPES = new Set<string>(Object.values(SessionType));
const QUESTION_FORMATS = new Set<string>(Object.values(QuestionFormat));

const topics = JSON.parse(readFileSync(topicsPath, 'utf-8')) as TopicSeed[];
const questions = JSON.parse(
    readFileSync(questionsPath, 'utf-8'),
) as QuestionSeed[];

if (!Array.isArray(questions)) {
    throw new Error('questions.json must be a top-level array');
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function questionLabel(question: QuestionSeed, index: number): string {
    return `questions.json[${index}] (topicSlug=${question.topicSlug})`;
}

function validateQuestionSeed(question: QuestionSeed, index: number): void {
    const label = questionLabel(question, index);

    if (typeof question.topicSlug !== 'string' || !question.topicSlug.trim()) {
        throw new Error(`${label}: topicSlug is required`);
    }

    if (!SESSION_TYPES.has(question.sessionType)) {
        throw new Error(
            `${label}: invalid sessionType "${String(question.sessionType)}"`,
        );
    }

    if (!QUESTION_FORMATS.has(question.format)) {
        throw new Error(
            `${label}: invalid format "${String(question.format)}"`,
        );
    }

    if (typeof question.prompt !== 'string' || !question.prompt.trim()) {
        throw new Error(`${label}: prompt is required`);
    }

    if (question.format === QuestionFormat.MULTIPLE_CHOICE) {
        if (
            !Array.isArray(question.options) ||
            question.options.length < 2 ||
            !question.options.every((option) => typeof option === 'string')
        ) {
            throw new Error(
                `${label}: MULTIPLE_CHOICE requires options as an array of strings (length >= 2)`,
            );
        }

        if (
            typeof question.correctAnswer !== 'string' ||
            !/^\d+$/.test(question.correctAnswer)
        ) {
            throw new Error(
                `${label}: MULTIPLE_CHOICE correctAnswer must be a zero-based option index encoded as a string`,
            );
        }

        const optionIndex = Number(question.correctAnswer);
        if (optionIndex < 0 || optionIndex >= question.options.length) {
            throw new Error(
                `${label}: MULTIPLE_CHOICE correctAnswer "${question.correctAnswer}" is out of range for ${question.options.length} options`,
            );
        }
    } else if (question.options !== undefined) {
        throw new Error(
            `${label}: options are only allowed for MULTIPLE_CHOICE (found format=${question.format})`,
        );
    }
}

function toQuestionContent(question: QuestionSeed) {
    return {
        sessionType: question.sessionType,
        format: question.format,
        prompt: question.prompt,
        options:
            question.options === undefined
                ? Prisma.DbNull
                : question.options,
        correctAnswer: question.correctAnswer ?? null,
        explanation: question.explanation ?? null,
        codeSnippet: question.codeSnippet ?? null,
    };
}

async function main() {
    console.log(`Seeding ${topics.length} topics...`);

    for (const topic of topics) {
        await prisma.topic.upsert({
            where: {
                slug: topic.slug,
            },
            update: {
                name: topic.name,
                area: topic.area,
                category: topic.category,
            },
            create: {
                name: topic.name,
                slug: topic.slug,
                area: topic.area,
                category: topic.category,
            },
        });
    }

    console.log(`Seeded ${topics.length} topics successfully.`);

    const seededTopics = await prisma.topic.findMany({
        select: {
            id: true,
            slug: true,
        },
    });

    const topicIdBySlug = new Map(
        seededTopics.map((topic) => [topic.slug, topic.id]),
    );

    console.log(`Seeding ${questions.length} questions...`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let index = 0; index < questions.length; index += 1) {
        const question = questions[index];
        validateQuestionSeed(question, index);

        const topicId = topicIdBySlug.get(question.topicSlug);
        if (!topicId) {
            throw new Error(
                `${questionLabel(question, index)}: unknown topicSlug "${question.topicSlug}"`,
            );
        }

        const content = toQuestionContent(question);

        const existing = await prisma.question.findFirst({
            where: {
                topicId,
                prompt: question.prompt,
            },
        });

        if (existing) {
            const unchanged =
                existing.sessionType === content.sessionType &&
                existing.format === content.format &&
                existing.prompt === content.prompt &&
                JSON.stringify(existing.options ?? null) ===
                    JSON.stringify(question.options ?? null) &&
                (existing.correctAnswer ?? null) === content.correctAnswer &&
                (existing.explanation ?? null) === content.explanation &&
                (existing.codeSnippet ?? null) === content.codeSnippet;

            if (unchanged) {
                skipped += 1;
                continue;
            }

            await prisma.question.update({
                where: {
                    id: existing.id,
                },
                data: content,
            });
            updated += 1;
            continue;
        }

        await prisma.question.create({
            data: {
                topicId,
                ...content,
            },
        });
        created += 1;
    }

    console.log(
        `Seeded questions successfully. created=${created}, updated=${updated}, skipped=${skipped}`,
    );
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
