/**
 * Build prisma/seed-data/batches/rev-mcq-to-8.json from curated packs
 * so each topic reaches 8 REVISION MCQs.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import fundamentals from './data/rev-mcq-fundamentals.mjs';
import core from './data/rev-mcq-core.mjs';
import asyncPack from './data/rev-mcq-async.mjs';
import advanced from './data/rev-mcq-advanced.mjs';

const root = process.cwd();
const questionsPath = resolve(root, 'prisma/seed-data/questions.json');
const topicsPath = resolve(root, 'prisma/seed-data/topics.json');
const outPath = resolve(root, 'prisma/seed-data/batches/rev-mcq-to-8.json');

const packs = { ...fundamentals, ...core, ...asyncPack, ...advanced };
const topics = JSON.parse(readFileSync(topicsPath, 'utf8'));
const questions = JSON.parse(readFileSync(questionsPath, 'utf8'));

const existingPrompts = new Set(questions.map((q) => q.prompt));
const revMcqBySlug = new Map(topics.map((t) => [t.slug, 0]));
for (const q of questions) {
  if (q.sessionType === 'REVISION' && q.format === 'MULTIPLE_CHOICE') {
    revMcqBySlug.set(q.topicSlug, (revMcqBySlug.get(q.topicSlug) || 0) + 1);
  }
}

const batch = [];
const shortages = [];

for (const topic of topics) {
  const have = revMcqBySlug.get(topic.slug) || 0;
  const need = Math.max(0, 8 - have);
  const pack = packs[topic.slug] || [];
  if (pack.length < need) {
    shortages.push({ slug: topic.slug, need, pack: pack.length });
    continue;
  }
  const slice = pack.slice(0, need);
  for (const item of slice) {
    if (existingPrompts.has(item.prompt)) {
      throw new Error(`Duplicate prompt for ${topic.slug}: ${item.prompt}`);
    }
    existingPrompts.add(item.prompt);
    const idx = Number(item.correctAnswer);
    if (
      !Array.isArray(item.options) ||
      !Number.isInteger(idx) ||
      String(idx) !== item.correctAnswer ||
      idx < 0 ||
      idx >= item.options.length
    ) {
      throw new Error(`Bad MCQ for ${topic.slug}: ${item.prompt}`);
    }
    batch.push({
      topicSlug: topic.slug,
      sessionType: 'REVISION',
      format: 'MULTIPLE_CHOICE',
      prompt: item.prompt,
      options: item.options,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      ...(item.codeSnippet ? { codeSnippet: item.codeSnippet } : {}),
    });
  }
}

if (shortages.length) {
  console.error(JSON.stringify({ shortages }, null, 2));
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      written: outPath,
      batchCount: batch.length,
      expected: [...revMcqBySlug.values()].reduce((a, n) => a + Math.max(0, 8 - n), 0),
    },
    null,
    2,
  ),
);
