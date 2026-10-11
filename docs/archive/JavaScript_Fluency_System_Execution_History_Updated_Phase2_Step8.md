# JavaScript Fluency System — Execution History & Progress Tracker

> Living document. Update after every verified step. This is the single source of truth for what's been decided and what's been done — future work (and future AI assistant sessions) should refer to this instead of relying on conversation history.

---

## 1. Project Summary

A personal, single-user JavaScript revision and practice system, following a **recall → answer → check → practice → revise** learning loop, with spaced repetition scheduling (1 / 3 / 7 / 14 / 30 days) and a three-state topic status (Green / Yellow / Red). Goal: daily-use tool supporting the path to job-ready 2-year Full Stack Developer.

Full functional spec: `JavaScript_Fluency_System_Website_Specification.md`.

---

## 2. Locked-In Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Scope | Single-user (just the owner) | No real auth needed — removes signup/login/password-reset entirely |
| Auth model | Single bearer token, env var server-side + localStorage client-side after one-time setup | Enables cross-device sync without building a user system |
| Frontend | Angular + TypeScript + SCSS (standalone components, zoneless) | Per original spec direction |
| Hosting | Vercel (Hobby / free tier) | Personal, non-commercial use qualifies for free hosting |
| Backend | Vercel serverless functions (Node/TypeScript) | No separate server to manage; deploys with the frontend |
| Database | Neon Postgres (Vercel marketplace integration) | Relational data model fits topics/questions/history; genuine permanent free tier |
| ORM | Prisma (pinned to v7 line) | Type-safe queries in TS; schema file doubles as data-model documentation |
| Question content | AI-generated seed bank, produced after schema + skeleton exist | Avoids generating content against a data shape that might still change |
| Cost target | $0 across the whole stack | Confirmed achievable |

---

## 3. Repo Structure (confirmed, matches scaffolded project)

```
js-fluency-system/
├── .github/workflows/ci.yml
├── api/
│   ├── _lib/            (prisma.ts, auth.ts)
│   ├── topics/
│   ├── revision/
│   ├── mistakes/
│   ├── deep-dive/
│   └── progress/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── seed-data/        (planned: topics.json, questions.json)
│   └── migrations/
├── src/app/
│   ├── core/
│   ├── shared/
│   └── features/ (dashboard, revision-session, deep-dive, mistake-log, roadmap)
├── shared-types/
└── package.json / tsconfig*.json / angular.json
```

---

## 4. Phase Plan

- [x] **Phase 1 — Skeleton**: Angular scaffolded, Prisma schema drafted, Neon connected, migration applied, `/api/health` deployed and verified in prod
- [ ] **Phase 2 — Topics + Questions** *(in progress — see Section 6)*
- [ ] **Phase 3 — Revision Scheduling**: spaced repetition logic (1/3/7/14/30), Today's Revision screen, dashboard MVP
- [ ] **Phase 4 — Progress + Mistakes**: confidence tracking, status algorithm v1, Mistake Log, Deep Dive Queue
- [ ] **Phase 5 — Persistent Cloud Data**: full sync verified laptop ↔ mobile
- [ ] **Phase 6 — Mobile Optimization**: responsive pass, touch targets, dark/light theme
- [ ] **Phase 7 — AI Assistance** (post-MVP): in-app question generation, mistake analysis, difficulty adjustment

---

## 5. Change Log (Phase 1)

1. Tech stack, single-user model, free-tier plan confirmed.
2. Prisma schema v1 confirmed — no `User` model; `area`/`category` kept as plain strings.
3. Repo structure confirmed — single repo/single Vercel project, feature-based Angular layout, resource-based `api/`, shared `shared-types/`.
4. Local environment verified (Node v22.22.3, npm 10.9.8, Git 2.43.0, Angular CLI 20.3.26). Neon project created (Free plan, AWS US East 2).
5. Vercel CLI installed. Angular app scaffolded — zoneless, routing + SCSS. Planned folder structure created and verified.
6. Prisma pinned to stable v7 line (npm `latest` tag pointed to an unreleased v8 RC incompatible with the schema/migrate workflow).
7. Prisma 7 breaking change discovered: datasource URL moved from `schema.prisma` to `prisma.config.ts` (dotenv-loaded). `.env`/`.env.local` added to `.gitignore`.
8. First migration applied against live Neon DB (`prisma migrate dev --name init`) — all tables created.
9. Repo pushed to GitHub (`Bhalchandra3/js-fluency-system`, `master` branch).
10. Built `api/_lib/prisma.ts` (shared Prisma Client singleton) and `api/health.ts` (DB-backed health check, intentionally unauthenticated). Added `postinstall: "prisma generate"`.
11. Vercel project created and linked, GitHub auto-deploy connected to `master`.
12. `DATABASE_URL` added as Vercel env var across Production/Preview/Development.
13. First production deploy succeeded — `js-fluency-system.vercel.app` live and Ready.
14. **Phase 1 complete** — `/api/health` confirmed responding correctly end-to-end in production.
15. Prod bug found & fixed: `.js`-extension import resolution error on `/api/health`. Root cause: `"type": "module"` in `package.json` forced native ESM execution for Vercel functions, which strictly requires extensions on relative imports. Fix: removed `"type": "module"`; confirmed via redeploy. `tsconfig*.json` (`"module": "preserve"`) needed no changes.

---

## 6. Phase 2 — Topics + Questions

**Governing document:** `JavaScript_Fluency_System_Phase_2_Development_Order.md` (uploaded) — the authoritative, locked execution order for this phase. Steps are followed in sequence; each must be verified complete before the next begins.

### Execution Order (12 steps)

| # | Step | Status |
|---|---|---|
| 1 | Finalize `Topic` and `Question` Prisma models | ✅ **complete** |
| 2 | Finalize question-bank format (decision: JSON seed + `seed.ts`) | ✅ **complete** |
| 3 | Build topic roadmap seed data (from spec §13) | ✅ **complete** |
| 4 | Implement `prisma/seed.ts` | ✅ **complete** |
| 5 | Seed and verify Neon (topics) | ✅ **complete** |
| 6 | Verify bearer-token authentication (`api/_lib/auth.ts`) | ✅ **complete** |
| 7 | Build `GET /api/topics` | ✅ **complete** |
| 8 | Test `GET /api/topics` locally (no/invalid/valid token) | ✅ **complete** |
| 9 | Generate the AI question bank | 🔵 **current** |
| 10 | Load questions through the seed process | ⬜ |
| 11 | Deploy and verify authentication in production | ⬜ |
| 12 | Production smoke test (full Phase 2 flow) | ⬜ |

### Phase 2 Completion Criteria (from governing doc)

- [x] `Topic` model finalized
- [x] `Question` model finalized
- [x] Schema migrations applied, if any
- [x] Question-bank format finalized
- [x] Initial topic roadmap created
- [x] `prisma/seed.ts` implemented
- [x] Topics seeded into Neon
- [ ] AI question bank generated
- [ ] Questions seeded into Neon
- [ ] Topic → Question relationships verified
- [x] Bearer-token auth verified locally
- [x] `GET /api/topics` implemented and tested locally
- [ ] `GET /api/topics` deployed
- [ ] Production auth verified
- [ ] Production API returns real Topic data
- [x] `/api/health` still functional
- [ ] No unresolved Phase 2 blockers

### Rules carried forward for this phase (from governing doc §5)

- Don't skip execution order without a technical reason.
- Don't regenerate/redesign the schema without checking existing schema + spec first.
- Don't generate question content against an unlocked schema.
- Prefer reproducible seed scripts over manual DB inserts.
- Never hard-code or expose production secrets (especially the bearer token).
- Test auth with missing, invalid, and valid tokens — locally and in production, separately.
- Don't mark a task complete based on code creation alone — verify behavior.
- Update this tracker after each decision so future work doesn't rely on conversation history.

---

## 7. Current Status

**Phase:** 2 — Topics + Questions

**Completed through:** Step 8 — Test `GET /api/topics` locally

**Current step:** Step 9 — Generate the AI question bank

**Verified work completed:**
- `Topic` and `Question` Prisma models finalized and migrated.
- `Question.codeSnippet` added as a nullable field and verified in Prisma Studio.
- JSON question-bank format finalized.
- `prisma/seed-data/topics.json` created with 52 JavaScript topics.
- Topic seed data validated: 52 topics and 52 unique slugs.
- `prisma/seed.ts` implemented.
- Prisma 7 seed configuration added to `prisma.config.ts`: `seed: 'tsx prisma/seed.ts'`.
- `tsx` added as a development dependency.
- `npx prisma db seed` successfully seeded all 52 topics into Neon.
- Prisma Studio verified the seeded Topic records.
- Running the seed a second time completed successfully without creating duplicates, confirming idempotent topic seeding.
- The PostgreSQL SSL-mode message observed during seeding was a warning; the seed completed successfully.
- `api/_lib/auth.ts` created with reusable bearer-token validation.
- A strong bearer token was generated locally using Node's cryptographic random-byte generator.
- Local `.env` configured with the server-side `BEARER_TOKEN` secret.
- `npx prisma generate` completed successfully after the authentication setup.
- `vercel dev` started successfully and served the local application at `http://localhost:3000`.
- Existing `GET /api/health` endpoint was verified locally after the auth setup.
- Local health response confirmed: `status: "ok"`, `dbConnected: true`, and `topicCount: 52`.
- `/api/health` remains intentionally unauthenticated and was not changed to require the bearer token.
- `api/topics/index.ts` was created as the Step 7 implementation for `GET /api/topics`.
- The endpoint reuses `requireBearerToken` from `api/_lib/auth.ts`.
- The endpoint reuses the shared Prisma client from `api/_lib/prisma.ts`.
- The endpoint queries Topics from Neon through Prisma and orders them by `name`.
- The endpoint returns `405` for unsupported HTTP methods.
- The endpoint returns `500` for database/server errors.
- The local `/api/topics` endpoint was tested with no token and returned `401 Unauthorized`.
- The local `/api/topics` endpoint was tested with an invalid bearer token and returned `401 Unauthorized`.
- The local `/api/topics` endpoint was tested with the correct local bearer token and returned `200 OK`.
- The successful authenticated response was parsed locally and confirmed to contain 52 Topics.
- Steps 7 and 8 are therefore verified complete.
- No `vercel.json` file exists in the current repository.
- No `api/_lib/errors.ts` file exists in the current repository; neither file was created for Step 7.

**Current implementation state:**
- Local authenticated Topic retrieval is working end-to-end:
  `PowerShell → Vercel dev → /api/topics → bearer-token validation → Prisma → Neon → 52 Topic records`.
- Production deployment/authentication for `/api/topics` has not yet been verified.

**Next action:** Begin Step 9 — Generate the AI question bank, using the finalized Prisma schema, finalized JSON question-bank format, and existing 52-topic roadmap.

**Important continuation note:** The Phase 2 Development Order remains the governing execution order. Steps 1–8 are complete and verified. Step 9 must now be completed before Step 10 (loading questions through the seed process), followed by Steps 11–12.
