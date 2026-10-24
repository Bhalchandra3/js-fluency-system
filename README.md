# JavaScript Fluency System

Personal JavaScript revision and practice app (Angular + Vercel serverless API + Prisma/Neon). Goal: low-friction daily study toward job-ready full-stack fluency.

## Documentation

| Document | Purpose |
|---|---|
| [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) | Product requirements and architecture reference |
| [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) | Overall project progress, completed-phase history, and handoff record |
| [`CURRENT_STEP.md`](./CURRENT_STEP.md) | Complete working record for the entire active phase (empty when no phase is active) |
| [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md) | Completed Phase 3 baseline (Steps 0–11; see tracker §5) |
| [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md) | Canonical Phase 4 plan (Progress + Mistakes; see tracker §8) |
| [`LOCAL_README.md`](./LOCAL_README.md) | Local development runbook (includes Postman Desktop notes) |
| [`postman/collections/Backend/`](./postman/collections/Backend/) | Git-native Postman collection for local API QA |
| [`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md) | Locked question-bank JSON contract |

Archived pre-consolidation sources: [`docs/archive/`](./docs/archive/).

## Quick start

Prefer the full local API + frontend workflow:

```bash
npm install
npx prisma generate
npx vercel dev
```

App is normally available at `http://localhost:3000`. See [`LOCAL_README.md`](./LOCAL_README.md) for Prisma Studio, migrations, seeding, and related commands.

Angular-only frontend (without the Vercel API):

```bash
ng serve
```

## Useful commands

```bash
ng build
ng test
npx prisma studio
npx prisma db seed
```

## Stack (summary)

- Frontend: Angular + TypeScript + SCSS
- API: Vercel serverless functions
- Database: Neon PostgreSQL via Prisma
- Auth: single bearer token (server env)

Details: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md).
