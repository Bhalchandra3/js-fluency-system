/**
 * Merge a batch JSON array into prisma/seed-data/questions.json.
 * Usage: node scripts/merge-question-batch.mjs prisma/seed-data/batches/rev-mcq-to-8.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const batchPath = process.argv[2];
if (!batchPath) {
  console.error('Usage: node scripts/merge-question-batch.mjs <batch.json>');
  process.exit(1);
}

const root = process.cwd();
const questionsPath = resolve(root, 'prisma/seed-data/questions.json');
const topicsPath = resolve(root, 'prisma/seed-data/topics.json');

const topics = JSON.parse(readFileSync(topicsPath, 'utf8'));
const slugSet = new Set(topics.map((t) => t.slug));
const questions = JSON.parse(readFileSync(questionsPath, 'utf8'));
const batch = JSON.parse(readFileSync(resolve(root, batchPath), 'utf8'));

if (!Array.isArray(batch)) {
  throw new Error('Batch must be a top-level array');
}

const existingPrompts = new Set(questions.map((q) => q.prompt));
const added = [];

for (let i = 0; i < batch.length; i++) {
  const q = batch[i];
  const label = `batch[${i}]`;
  if (!slugSet.has(q.topicSlug)) {
    throw new Error(`${label}: unknown topicSlug ${q.topicSlug}`);
  }
  if (q.sessionType !== 'REVISION' || q.format !== 'MULTIPLE_CHOICE') {
    throw new Error(`${label}: expected REVISION MULTIPLE_CHOICE`);
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    throw new Error(`${label}: options required`);
  }
  const idx = Number(q.correctAnswer);
  if (!Number.isInteger(idx) || String(idx) !== q.correctAnswer || idx < 0 || idx >= q.options.length) {
    throw new Error(`${label}: invalid correctAnswer`);
  }
  if (existingPrompts.has(q.prompt)) {
    throw new Error(`${label}: duplicate prompt: ${q.prompt.slice(0, 80)}`);
  }
  existingPrompts.add(q.prompt);
  added.push(q);
}

const merged = [...questions, ...added];
writeFileSync(questionsPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

const bySlug = new Map();
for (const t of topics) bySlug.set(t.slug, { total: 0, revMcq: 0 });
for (const q of merged) {
  const row = bySlug.get(q.topicSlug);
  if (!row) continue;
  row.total += 1;
  if (q.sessionType === 'REVISION' && q.format === 'MULTIPLE_CHOICE') row.revMcq += 1;
}

const thin = [...bySlug.entries()].filter(([, v]) => v.revMcq < 8);
const under5 = [...bySlug.entries()].filter(([, v]) => v.total < 5);

console.log(
  JSON.stringify(
    {
      added: added.length,
      totalQuestions: merged.length,
      topicsBelow8RevMcq: thin.length,
      topicsBelow5Total: under5.length,
      thinSample: thin.slice(0, 5).map(([s, v]) => ({ slug: s, revMcq: v.revMcq })),
    },
    null,
    2,
  ),
);

if (thin.length || under5.length) {
  process.exitCode = 1;
}
