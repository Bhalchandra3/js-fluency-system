# Question bank batches

Offline REVISION MCQ expansion batches. Merge into `../questions.json` with:

```bash
node scripts/build-rev-mcq-to-8.mjs
node scripts/merge-question-batch.mjs prisma/seed-data/batches/rev-mcq-to-8.json
```

`rev-mcq-to-8.json` — fills every topic to **8** `REVISION` + `MULTIPLE_CHOICE` (~311 adds; bank ~571).
