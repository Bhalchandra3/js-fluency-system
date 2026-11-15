# Question bank batches

Offline REVISION MCQ expansion batches. Merge into `../questions.json` with:

```bash
node scripts/build-rev-mcq-to-8.mjs
node scripts/merge-question-batch.mjs prisma/seed-data/batches/rev-mcq-to-8.json
```

## `rev-mcq-to-8.json`

Fills every topic to **8** `REVISION` + `MULTIPLE_CHOICE` (~311 adds; bank ~571).

**Status (2026-11-15):** Applied — merged into `questions.json`, committed as `9150ac8`, and seeded on Neon **dev** and **production** after owner-authorized fresh-start wipes.

Env / branch mapping: see [`PROJECT_TRACKER.md`](../../../PROJECT_TRACKER.md) §11.9.
