# JavaScript Fluency System — Project Tracker

> Authoritative progress tracker: overall project status, completed-phase history, major decisions, conclusions, and next-phase handoff.
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)
> Active phase working record: [`CURRENT_STEP.md`](./CURRENT_STEP.md) (cleared when no phase is active — see §6.3)
> Question-bank contract: [`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md)
> Phase 4 plan (canonical): [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md)

---

## 1. Current snapshot

| Field | Value |
|---|---|
| **Current phase** | **Phase 4 — Progress + Mistakes** (Step 7 progress API done; Angular FE next) |
| **Active step** | Step 8 — Frontend data access (`CURRENT_STEP.md`) |
| **Completed through** | Phase 2 Steps 1–12; Phase 3 Steps 0–11 (Step 5 N/A); Phase 4 Steps 0–7 |
| **Next action** | Execute Step 8 — FE-local types/services for mistakes, deep dive, progress per Development Order §2.5.6; Neon migrate deploy still owner-authorized separately |
| **Backend on master** | `e4ef947` — `feat: complete Phase 4 backend APIs` (pushed to `origin/master` 2026-10-24) |
| **Phase 2 complete?** | **Yes** — all governing Phase 2 exit criteria verified |
| **Phase 3 complete?** | **Yes** — Steps 0–11 complete; tracker handoff verified |
| **Phase 4 complete?** | **No** — backend Steps 0–7 done; Angular Steps 8–11 remain |
| **Phase 3 baseline (completed)** | [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md) |
| **Phase 4 plan (active)** | [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md) |

---

## 2. Phase overview

| Phase | Objective | Status |
|---|---|---|
| **1 — Skeleton** | Angular app, Prisma schema, Neon, Vercel, production `/api/health` | ✅ Complete |
| **2 — Topics + Questions** | Locked models, topic/question seed data, local authenticated `GET /api/topics`, production verification | ✅ Complete |
| **3 — Revision Scheduling** | 1/3/7/14/30 intervals, Today’s Revision API + screen, dashboard MVP | ✅ Complete |
| **4 — Progress + Mistakes** | Confidence tracking, status algorithm v1, Mistake Log, Deep Dive Queue | 🟡 In progress (Steps 0–7 complete; Step 8 next) |
| **5 — Persistent Cloud Data** | Full laptop ↔ mobile sync verification | ⬜ Not started |
| **6 — Mobile Optimization** | Responsive/touch/theme polish | ⬜ Not started |
| **7 — AI Assistance** | Optional in-app generation, mistake analysis, difficulty adjustment | ⬜ Post-MVP |

Phase 1 product wording in the original website spec (“static learning dashboard”) is superseded for tracking by the skeleton/infra definition above; later phase intents align with the product specification.

---

## 3. Phase 1 — summary (complete)

Verified historically (see archived execution history):

- Single-user + free-tier stack locked; Prisma v7; Neon migration applied.
- Repo structure: Angular features, `api/` serverless routes, `shared-types/`, `prisma/`.
- Production deploy at `js-fluency-system.vercel.app`; `/api/health` verified in production.
- ESM import-extension production bug fixed by removing `"type": "module"` from `package.json`.

Archive: [`docs/archive/JavaScript_Fluency_System_Execution_History_Updated_Phase2_Step8.md`](./docs/archive/JavaScript_Fluency_System_Execution_History_Updated_Phase2_Step8.md)

---

## 4. Phase 2 — Topics + Questions

### 4.1 Objective

Establish initial learning data and the first authenticated API flow so Phase 3 can build scheduling on real topics/questions.

Canonical plan source (archived):
[`docs/archive/JavaScript_Fluency_System_Phase_2_Development_Order (1).md`](./docs/archive/JavaScript_Fluency_System_Phase_2_Development_Order%20(1).md)

### 4.2 Locked question-bank contract

Authoritative format: [`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md)

Key locked rules (summary only):

- Root: top-level JSON array in `prisma/seed-data/questions.json`
- Topic link: `topicSlug` → `topics.json` slug
- No `id` / `topicId` / `difficulty` / `hints` in JSON
- Fields: `sessionType`, `format`, `prompt`, optional `options`, `correctAnswer`, `explanation`, `codeSnippet`
- MCQ: `options` string array; `correctAnswer` zero-based index as string
- Coverage minimum: **5 questions per topic** (260 for 52 topics)

### 4.3 Execution order and status

| # | Step | Depends on | Status |
|---|---|---|---|
| 1 | Finalize `Topic` and `Question` Prisma models | Phase 1 | ✅ Complete |
| 2 | Finalize question-bank format (JSON + `seed.ts`) | Step 1 | ✅ Complete |
| 3 | Build topic roadmap seed data (`topics.json`) | Spec roadmap + Step 1 | ✅ Complete |
| 4 | Implement `prisma/seed.ts` | Steps 2–3 | ✅ Complete |
| 5 | Seed and verify Neon (topics) | Step 4 | ✅ Complete |
| 6 | Verify bearer-token authentication | `api/_lib/auth.ts` | ✅ Complete |
| 7 | Build `GET /api/topics` | Steps 5–6 | ✅ Complete |
| 8 | Test `GET /api/topics` locally | Step 7 | ✅ Complete |
| 9 | Generate the AI question bank | Steps 1–3; format locked | ✅ Complete — see below |
| 10 | Load questions through the seed process | Step 9 complete | ✅ Complete — see §4.4b |
| 11 | Deploy and verify authentication in production | Steps 7–8; env configured | ✅ Complete — see §4.4c |
| 12 | Production smoke test (full Phase 2 flow) | Steps 9–11 | ✅ Complete — see §4.4d |

### 4.4 Step 9 status (historical)

**Complete.** Question bank was contract-validated and content-reviewed (Steps 9.1–9.5). Seeding into Neon and Topic → Question verification were completed in **Step 10** (see §4.4b).

| Fact | Evidence |
|---|---|
| `questions.json` exists with **260** questions | Repo file count |
| All **52** topics have ≥5 questions | Repo validation |
| Category sizes: 10 / 15 / 13 / 14 topics; 50 / 75 / 65 / 70 questions | `topics.json` + bank recount |
| Fundamentals content reviewed | Step 9.1 |
| Core JavaScript content reviewed | Step 9.2 |
| Asynchronous JavaScript content reviewed | Step 9.3 |
| Advanced JavaScript content reviewed | Step 9.4 |
| Final cross-topic audit | Step 9.5 complete (3 redundancy differentiations applied) |
| Contract / integrity validation | Pass — 0 issues; no exact duplicate prompts |
| Neon seeding / DB relationships | Out of scope for Step 9 — completed in Step 10 (§4.4b) |

### 4.4b Step 10 status

**Complete.** Neon synchronized with validated `questions.json`.

| Fact | Evidence |
|---|---|
| Seed command | `npx prisma db seed` → `created=9, updated=7, skipped=244` |
| Obsolete rows removed | 9 exact IDs deleted after replacement verification |
| Content-only updates | 7 questions updated (content-only) and verified |
| Final counts | 52 topics, 260 questions, 5/topic |
| JSON ↔ DB parity | Every `(topicSlug, prompt)` maps 1:1; 0 content mismatches |
| Integrity | No orphans; no duplicate `(topicId, prompt)` groups |
| Backup of obsolete rows | `.local/step10-backups/obsolete-questions-2026-10-11T16-40-47-638Z.json` (under gitignored `.local/`) |
| Commit on `master` | `aba4f9feaeaf9e317468d7944677df1a2e6dfc47` |

### 4.4c Step 11 status (production deploy + auth)

**Complete.**

| Fact | Evidence |
|---|---|
| Vercel Production deployment | Ready; commit `aba4f9f` |
| `GET /api/health` | `200` — `status: "ok"`, `dbConnected: true`, `topicCount: 52` |
| Topics without token | `401` |
| Topics with invalid token | `401` |
| Topics with valid bearer token | `200` + topic payload |
| Secret handling | Bearer token was not written into documentation or logs |

### 4.4d Step 12 status (production smoke test)

**Complete.**

| Fact | Evidence |
|---|---|
| Health path intact | Production `/api/health` `200` with DB connected |
| Auth gate | Missing/invalid token → `401`; valid → `200` |
| Real Topic data | Response `status: "ok"` with `topics` array |
| Topic fields | `id`, `name`, `slug`, `area`, `category`, `status`, `intervalDays`, `nextRevisionDate`, `createdAt`, `updatedAt` |
| Topic count / unique slugs | **52 / 52** (read-only production response check) |
| Questions in Neon + relations | Verified in Step 10; production health reports `topicCount: 52` against the same data store |
| Production Prisma/module errors | None observed (health + topics succeeded) |

### 4.5 Verified work (Steps 1–8 highlights)

- Models finalized; `Question.codeSnippet` nullable; migrations applied.
- `topics.json`: 52 topics, unique slugs; seeded to Neon; idempotent re-seed verified.
- `prisma/seed.ts` + `prisma.config.ts` seed via `tsx`.
- Local bearer auth; `/api/health` local OK (`topicCount: 52`); health remains unauthenticated.
- Local `GET /api/topics`: missing/invalid → `401`; valid → `200` with 52 topics.
- Production deploy/auth verified in Steps 11–12 (§4.4c–4.4d).

### 4.6 Phase 2 completion checklist

Aligned with governing Phase 2 development-order exit criteria:

- [x] `Topic` / `Question` models finalized; migrations applied as needed
- [x] Question-bank format finalized
- [x] Initial topic roadmap created
- [x] `prisma/seed.ts` implemented
- [x] Topics seeded into Neon
- [x] AI question bank generated
- [x] Questions seeded into Neon (Step 10)
- [x] Topic → Question relationships verified (Step 10)
- [x] Bearer-token auth verified locally
- [x] `GET /api/topics` implemented and verified locally
- [x] `GET /api/topics` deployed (Step 11)
- [x] Production authentication verified (Step 11)
- [x] Production API returns real Topic data (Steps 11–12)
- [x] Production / Neon DB contains real Topic/Question data
- [x] Phase 1 `/api/health` remains functional in production
- [x] No unresolved Phase 2 data/API blockers

### 4.7 Phase 2 conclusions

- Phase 2 exit criteria are satisfied (§4.6); Steps 1–12 are complete and verified.
- Production path verified: client → Vercel API → bearer auth → Prisma → Neon → seeded Topics (52) with Questions established in Neon.
- No unresolved Phase 2 data/API blockers were recorded at closeout.
- Canonical Phase 2 plan remains archived at [`docs/archive/JavaScript_Fluency_System_Phase_2_Development_Order (1).md`](./docs/archive/JavaScript_Fluency_System_Phase_2_Development_Order%20(1).md).

### 4.8 Phase 3 handoff (from Phase 2 closeout — historical)

Phase 2 closed with this handoff. Phase 3 was subsequently started and **completed** (see §5).

| Handoff item | Detail |
|---|---|
| **Next phase** | Phase 3 — Revision Scheduling |
| **Intended scope** | Spaced repetition intervals 1/3/7/14/30; due-today determination; revision session flow; answer submission; confidence capture; next-revision updates; Today’s Revision API + Angular screen; initial dashboard data |
| **Prerequisites** | Finalized Topic/Question data and authenticated API infrastructure from Phase 2 |
| **Unresolved at handoff** | None recorded in the Phase 2 closeout working record |
| **Approved baseline** | [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md) |
| **Outcome** | Phase 3 complete — see §5 |

---

## 5. Phase 3 — Revision Scheduling (complete)

### 5.1 Objective

Deliver a reliable daily revision loop: identify due/overdue topics (`Asia/Kolkata` calendar, UTC storage), run Today’s Revision with embedded `REVISION` questions, record correctness and confidence separately, finalize scheduling once via explicit complete on the discrete 1 / 3 / 7 / 14 / 30 ladder, and show an initial dashboard summary + CTA.

Canonical completed baseline:
[`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)

Product framing: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) §§5.3–5.6; phase intent §11.

### 5.2 Durable decisions

| Decision | Summary |
|---|---|
| **G1** | Core revision loop only; Phase 4 owns status algorithm / Mistake Log / Deep Dive |
| **G2** | UTC storage; fixed user calendar zone `Asia/Kolkata`; due/overdue by Kolkata calendar day |
| **G3** | Embed `REVISION` questions in Today’s Revision read; **no** bank-wide `GET /api/questions` (Step 5 N/A) |
| **G4** | Discrete ladder only: Advance / Reinforce / Reset / Reinforce-at-1 |
| **G5** | Correctness and confidence independent; session aggregation precedence: Incorrect → Reset; else `DIDNT_UNDERSTAND` → Reinforce-at-1; else `DIFFICULT` → Reinforce; else Advance |
| **G6** | No required `DailyProgress` write-path; dashboard from Topic / session data |
| **G7** | Default authenticated entry = Today’s Revision; `/dashboard` summary + CTA |
| **G8** | No new `shared-types/` package; FE-local types; BE validates contracts |
| **Decision A** | Schedule updates **only** on explicit `POST /api/revision/complete`; never on answer submit; at most once per completed session |
| **Decision B** | Freeze question identity + order via `RevisionSessionQuestion`; block learner-facing content edits while referenced by OPEN sessions |
| **Session shape** | One due topic per OPEN session; sticky resume preferred; skip topics with zero REVISION questions |

### 5.3 Execution order and status

| # | Step | Status | Evidence / notes |
|---|---|---|---|
| 0 | Approve Development Order | ✅ Complete | Baseline approved; phase started (`52d4bfa`) |
| 1 | Architecture / scheduling rules | ✅ Complete | Decisions A/B; G1–G8 locked |
| 2 | Scheduling helpers | ✅ Complete | `api/_lib/scheduling/`; `npm run test:scheduling` 30/30 |
| 2.5 | Schema + Neon migration | ✅ Complete | `20261015164300_add_revision_session` applied **2026-10-15**; disposable DB regression 6/6 |
| 3 | `GET /api/revision/today` | ✅ Complete | `test:revision-today` 18/18 (2026-10-16) |
| 4 | Answers + complete APIs | ✅ Complete | `test:revision-write` 16/16 (2026-10-16) |
| 5 | Separate questions endpoint | **N/A** | G3 — not required |
| 6 | FE data access + auth | ✅ Complete | Token setup, interceptor, `RevisionApiService` (2026-10-16) |
| 7 | Today’s Revision UI | ✅ Complete | Default route + full loop; `ng test` 47/47 (2026-10-16) |
| 8 | Initial dashboard | ✅ Complete | `/dashboard` MVP; `ng test` 57/57 (2026-10-18) |
| 9 | Local end-to-end verification | ✅ Complete | Manual local API + Postman Desktop/Git — see §5.4 |
| 10 | Production smoke testing | ✅ Complete | Owner-reported complete (2026-10-20) — see §5.4 |
| 11 | Documentation closeout / handoff | ✅ Complete | This section; `CURRENT_STEP.md` cleared after verified transfer |

### 5.4 Verification highlights

| Area | Result | Evidence class |
|---|---|---|
| Scheduling policy unit tests | 30/30 | Repository-verified (`test:scheduling`) |
| Revision today integration | 18/18 | Repository-verified (`test:revision-today`) |
| Answers + complete integration | 16/16 | Repository-verified (`test:revision-write`) |
| Angular unit suite (dashboard era) | 57/57 | Repository-verified (`ng test`) |
| Schema migration on Neon | Applied 2026-10-15 | Repository-verified deploy record |
| Postman Git collection | `012d95e` — `test: add Git-managed Postman API collection for Phase 3` | Repository commit (pushed) |
| Postman Desktop (Windows) | Collection available; Local Development env; local APIs reported working | **Owner-confirmed** |
| Local API E2E (Step 9) | Manual testing + Postman; formal per-request HTTP matrix **not filed** | **Owner-confirmed** (matrix not mandatory) |
| Production smoke (Step 10) | Reported complete 2026-10-20; granular statuses / deployment IDs / mutation outcomes **not filed** | **Owner-reported** |
| `tsconfig.spec.json` `rootDir` | `"rootDir": "./src/app"` | Commit `bfeb58f` — `fix: correct rootDir in tsconfig.spec.json for proper test compilation` |
| Spec/build validation after `rootDir` fix | `tsc --noEmit` (app+spec), `npm run build`, `ng test` 57/57 | Reported with the fix task (not re-run at closeout) |

**APIs delivered:** `GET /api/revision/today`, `POST /api/revision/answers`, `POST /api/revision/complete` (bearer auth). Phase 1 `/api/health` and Phase 2 `GET /api/topics` remain in scope and were accepted as still functional via Step 10 owner-reported smoke (granular production statuses not filed).

**Postman assets (local QA):** `.postman/resources.yaml`; `postman/collections/Backend/`; `postman/environments/`; `postman/globals/`; `postman/scripts/export_v21_for_desktop.py`. Desktop secrets stay as Desktop Current values only.

### 5.5 Phase 3 completion checklist

Aligned with Development Order §9 exit criteria:

- [x] G1–G8 recorded as approved and implemented
- [x] UTC storage + Asia/Kolkata due/overdue verified with boundary tests
- [x] Discrete ladder + G5 mapping/aggregation verified
- [x] Incomplete sessions do not finalize; last answer does not finalize; completed sessions finalize once via explicit complete
- [x] Today’s Revision embeds REVISION questions; no bank-wide questions API
- [x] Correct answers not exposed before required evaluation
- [x] Angular default entry is Today’s Revision; `/dashboard` summary works
- [x] LX1–LX9 satisfied proportionately; missing explanations not invented
- [x] Enterprise standards evidenced (tests, local smoke, production smoke reported, safe logging / no secrets in Git)
- [x] `/api/health` and `GET /api/topics` accepted as passing in production via Step 10 owner-reported smoke
- [x] Tracker handoff complete; `CURRENT_STEP.md` cleared after verified transfer

### 5.6 Phase 3 conclusions and known limitations

**Conclusions**

- Phase 3 exit criteria are satisfied (§5.5); Steps 0–11 are complete (Step 5 N/A).
- Core revision loop is delivered end-to-end: scheduling helpers → Neon schema → revision APIs → Angular Today’s Revision + dashboard → local verification → production smoke (reported).
- Canonical plan and step table remain in [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md).
- Detailed working notes that lived in `CURRENT_STEP.md` during the phase are superseded by this section + git history of that file; do not re-open Phase 3 implementation without a documented reason.

**Known limitations (carry forward)**

| Limitation | Notes |
|---|---|
| No formal per-request local HTTP matrix | Step 9 closed on manual + Postman confirmation |
| No granular production smoke matrix | Step 10 owner-reported; statuses / deployment IDs / mutation outcomes not filed |
| Full due-topic name list on dashboard | Not in today payload; deferred |
| Deep Dive / Mistake Log / Green-Yellow-Red status | Phase 4 scope |
| OPEN-session question-edit API guard | Seed guard exists; no general edit API yet |
| Prior-answer feedback on OPEN resume | GET today omits evaluation fields; feedback after in-session submit |
| Bearer token in `localStorage` | XSS-accessible on same origin; not embedded in source |
| Fixed Asia/Kolkata zone | Preference UI later |
| Pre-migration Neon recovery artifacts | Snapshot / backup branch from 2026-10-15 may still exist; Free PITR window is short |

### 5.7 Phase 4 handoff

Phase 3 is complete. **Phase 4 formally started in planning mode (2026-10-22).** Feature implementation has **not** started.

| Handoff item | Detail |
|---|---|
| **Next phase** | Phase 4 — Progress + Mistakes |
| **Intended scope** | Confidence tracking productization, status algorithm v1 (Green / Yellow / Red), Mistake Log, Deep Dive Queue, richer progress — consuming Phase 3 session history and schedule fields |
| **Product sources** | [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) §§5.4, 5.7–5.8, §11 phase intent, §12.1 / §12.7 (Phase 4 policy approved at Step 0; see Development Order) |
| **Canonical plan** | [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md) |
| **Active working record** | [`CURRENT_STEP.md`](./CURRENT_STEP.md) |
| **Tracker framing** | This document §2 Phase 4 row; planning status §8 |
| **Prerequisites** | Phase 3 revision APIs + `RevisionSession` / `SessionLog` history + Topic schedule fields; authenticated Angular shell (Today’s Revision + dashboard) — **verified present** |
| **Carry-forward decisions** | Do not silently change G1–G8 or Decisions A/B; Phase 3 scheduling remains backend-authoritative and finalize-once |
| **Approved Phase 4 decisions (Step 0, 2026-10-23)** | Status policy `phase4-status-v1`; Mistake Log auto+manual with **no** auto Question insert; Deep Dive ensure on Red — see Phase 4 Development Order §§4–5 |
| **Architecture lock (Step 1, 2026-10-23)** | Development Order §2.5 — status persistence, Mistake schema, complete-path order, APIs, FE routes, testing, step acceptance; see also this tracker §8.3 |
| **Still open inside Phase 4** | Implementation Steps 8–14; Neon production migrate deploy for Mistake provenance still pending owner authorization |
| **Recommended next action** | Execute Step 8 — Frontend data access (§2.5.6); apply migration to Neon only with explicit owner approval |
| **Do not** | Re-open Phase 3 delivery; invent HTTP evidence that was not filed; clear or rewrite the Phase 3 Development Order baseline without cause; skip §2.5 contracts when implementing |

---

## 6. Phase lifecycle and step-execution rules

Operational process for every phase. Product requirements remain in [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md). The active phase’s full working record lives in [`CURRENT_STEP.md`](./CURRENT_STEP.md).

### 6.1 Phase start

1. Review [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md), this tracker (including the previous phase’s handoff), and any unresolved decisions.
2. Initialize [`CURRENT_STEP.md`](./CURRENT_STEP.md) for the new phase only when that phase actually starts (not as part of completing the previous phase).
3. Plan the entire phase in [`CURRENT_STEP.md`](./CURRENT_STEP.md) **before** implementation: ordered steps, dependencies, decisions or approvals required, and exit criteria.
4. Record the phase’s initial scope and starting status in [`CURRENT_STEP.md`](./CURRENT_STEP.md); update this tracker’s current snapshot to name the new phase and active planning/execution step.

### 6.2 During the phase

1. Update [`CURRENT_STEP.md`](./CURRENT_STEP.md) as each step progresses.
2. Record implementation outcomes, verification results, decisions and reasoning, unresolved issues, conclusions, and the exact stopping point / next action.
3. Synchronize this tracker with meaningful project-wide status changes (snapshot, phase overview, completed-step marks, major decisions)—do **not** duplicate the entire working record here.
4. Do not rely on chat history alone for decisions or status.

### 6.3 Phase completion and handoff

1. Finalize in [`CURRENT_STEP.md`](./CURRENT_STEP.md): phase history, decisions, conclusions, results, and completion status.
2. Transfer the relevant phase summary and history into this tracker, preserving the established structure (phase summary section, completion checklist, next-phase handoff) so completed work remains traceable.
3. Record in this tracker: next phase scope, prerequisites, unresolved decisions, and recommended starting action; update the current snapshot accordingly.
4. **Only after** that transfer is complete, clear [`CURRENT_STEP.md`](./CURRENT_STEP.md) so it contains no completed-phase working history and is ready to initialize for the next phase.
5. Do **not** initialize the cleared file for the next phase until that phase actually starts (see §6.1).

### 6.4 Standing engineering rules

1. Read [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md), this tracker, and the previous phase handoff before starting a phase or changing phase scope.
2. Do not skip the documented execution order without a documented technical reason.
3. Do not mark a step complete from code creation alone—verify behavior with evidence.
4. Prefer minimal scope; reuse existing conventions.
5. Prefer reproducible seeds over manual DB edits.
6. Keep seed content separate from loader logic.
7. Never hard-code or expose secrets (especially bearer tokens).
8. Test authenticated APIs with missing, invalid, and valid tokens.
9. Test production separately from local.
10. Do not regenerate/redesign Prisma schema without checking schema + specification.
11. Do not generate question content against an unlocked schema.
12. Preserve single-user architecture unless the specification changes.

---

## 7. Important links

| Resource | Path |
|---|---|
| Specification | [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) |
| Active phase record | [`CURRENT_STEP.md`](./CURRENT_STEP.md) (empty when no phase active) |
| Phase 3 Development Order (completed baseline) | [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md) |
| Phase 4 Development Order (canonical plan) | [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md) |
| Local runbook | [`LOCAL_README.md`](./LOCAL_README.md) |
| Postman Git-native collection | [`postman/collections/Backend/`](./postman/collections/Backend/) |
| Postman Desktop export script | [`postman/scripts/export_v21_for_desktop.py`](./postman/scripts/export_v21_for_desktop.py) |
| Question-bank contract | [`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md) |
| Topics seed | [`prisma/seed-data/topics.json`](./prisma/seed-data/topics.json) |
| Questions seed | [`prisma/seed-data/questions.json`](./prisma/seed-data/questions.json) |
| Archived sources | [`docs/archive/`](./docs/archive/) |

---

## 8. Phase 4 — Progress + Mistakes (backend APIs done; FE next)

### 8.1 Objective

Deliver status algorithm v1 (Green / Yellow / Red), Mistake Log, Deep Dive Queue, and richer progress/dashboard signals on top of the completed Phase 3 revision loop—without changing G5 scheduling or Decisions A/B.

Canonical plan:
[`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md)

### 8.2 Planning / lock status

| Field | Value |
|---|---|
| **Formally started** | Yes — planning mode (2026-10-22) |
| **Step 0 approval** | ✅ Approved 2026-10-23 (scope, status policy, Mistake/Deep Dive scope, delivery workflow) |
| **Step 1 architecture lock** | ✅ Complete 2026-10-23 (docs only; Development Order §2.5) |
| **Step 2 status helpers** | ✅ Complete 2026-10-24 — `api/_lib/status/`; `test:status` 10/10; `test:scheduling` 30/30 |
| **Step 3 Mistake schema** | ✅ Complete 2026-10-24 — migration `20261024163000_phase4_mistake_provenance` validated on local disposable Postgres; **Neon not applied** |
| **Step 4 complete-path** | ✅ Complete 2026-10-24 — status + Deep Dive ensure + auto-mistakes in `completeRevisionSession`; `test:revision-write` 31/31 |
| **Step 5 Mistake APIs** | ✅ Complete 2026-10-24 — `GET/POST /api/mistakes`, `GET/PATCH /api/mistakes/[id]`; `test:mistakes` 12/12 |
| **Step 6 Deep Dive APIs** | ✅ Complete 2026-10-24 — `GET /api/deep-dive`, `PATCH/DELETE /api/deep-dive/[topicId]`; `test:deep-dive` 11/11 |
| **Step 7 Progress API** | ✅ Complete 2026-10-24 — `GET /api/progress`; `test:progress` 7/7 |
| **Feature APIs / UI** | Backend summary APIs done; Angular **not started** (Steps 8–11) |
| **Active step** | Step 8 — Frontend data access |
| **Working record** | [`CURRENT_STEP.md`](./CURRENT_STEP.md) |

### 8.3 Approved / locked decisions (backend Steps 0–7 done; FE pending)

| Decision | Summary |
|---|---|
| **Status `phase4-status-v1` (Step 0)** | On first successful complete only: `ADVANCE`→Green, `REINFORCE`→Yellow, `REINFORCE_AT_1`/`RESET`→Red; never-completed topics keep default/prior status |
| **Mistake MVP (Step 0)** | Auto-create on complete for incorrect or correct+`DIDNT_UNDERSTAND`; manual edit/resolve; `turnedIntoQuestion` manual only; **no** auto Question insert |
| **Deep Dive (Step 0)** | Ensure `DeepDiveNote` when status becomes Red; owner notes; no auto-delete when leaving Red |
| **G6 (Step 0)** | Prefer derived dashboard data; no required `DailyProgress` write-path unless proven necessary |
| **Status persistence (Step 1)** | Reuse `Topic.status`; no new status columns; complete response `topicStatus` DTO carries policy version/reason |
| **Mistake schema (Step 1)** | Additive nullable `questionId` / `sessionId` / unique `sourceSessionLogId` / `resolvedAt`; SetNull FKs; migrate in Step 3 |
| **Complete transaction (Step 1)** | Same finalize txn: schedule → status → Deep Dive create-if-missing → auto-mistakes; duplicate complete is read-only |
| **APIs (Step 1)** | Mistake CRUD/resolve; Deep Dive list/patch/delete-by-topicId; thin `GET /api/progress`; extend complete JSON |
| **Dashboard (Step 1)** | `GET /api/progress` + existing today for CTA; due-topic name list deferred |
| **FE (Step 1)** | FE-local types/services; routes `/mistakes`, `/deep-dive`; enrich `/dashboard`; keep Today’s Revision default entry |

### 8.4 Execution order

| # | Step | Status |
|---|---|---|
| 0 | Approve Development Order | ✅ Complete — approved 2026-10-23 |
| 1 | Architecture lock | ✅ Complete — 2026-10-23 (Development Order §2.5) |
| 2 | Status policy helpers | ✅ Complete — 2026-10-24 (`api/_lib/status/`; `test:status` 10/10) |
| 3 | Schema migration (Mistake provenance) | ✅ Complete — 2026-10-24 (`20261024163000_phase4_mistake_provenance`; local disposable validate; Neon pending) |
| 4 | Complete-path integration | ✅ Complete — 2026-10-24 (`completeService` + `completeSideEffects`; `test:revision-write` 31/31; Neon/APIs/UI untouched) |
| 5 | Mistake Log APIs | ✅ Complete — 2026-10-24 (`api/mistakes/**` + `_lib/mistakes`; `test:mistakes` 12/12; Postman folder 05) |
| 6 | Deep Dive APIs | ✅ Complete — 2026-10-24 (`api/deep-dive/**` + `_lib/deep-dive`; `test:deep-dive` 11/11; Postman folder 06) |
| 7 | Progress / dashboard summary API (`GET /api/progress`) | ✅ Complete — 2026-10-24 (`api/progress/**` + `_lib/progress`; `test:progress` 7/7; Postman folder 07) |
| 8 | Frontend data access | 🟡 Next — not started |
| 9 | Mistake Log UI | ⬜ Not started |
| 10 | Deep Dive UI | ⬜ Not started |
| 11 | Dashboard enrichment | ⬜ Not started |
| 12 | Local E2E verification | ⬜ Not started |
| 13 | Production smoke | ⬜ Not started |
| 14 | Documentation closeout | ⬜ Not started |

### 8.5 Approved AI-assisted development workflow (Step 0, 2026-10-23)

Canonical detail: Phase 4 Development Order §9.1. Durable summary:

- **Model roles:** Cursor (paid model) is primary for repository investigation, architecture, implementation, complex debugging, integration, and final verification. OpenCode free models handle bounded, low-risk work (documentation drafts, file explanations, test checklists, edge-case suggestions, independent reviews).
- **Evidence over claims:** AI output is not verification; actual repository contents, command output, tests, API responses, and deployment results are the evidence. Use a second model only for useful independent review or uncertain output.
- **Token-efficient delivery:** avoid re-sending the whole repository; use focused tasks with relevant files and expected outcomes; implement small verifiable units; targeted tests during development and broader tests at integration checkpoints; keep the developer involved in understanding, diff review, approvals, and verification.
- **Branching/deployment:** `master` remains production; use short-lived feature branches; review diffs and run checks before merge; reuse existing GitHub checks and Vercel Preview deployments; keep preview/production databases isolated; test migrations on a disposable/dev database first; smoke-test meaningful production changes; no permanent `develop`/`staging`/`release` branches.
- **Learning objective:** for meaningful work, understand the relevant files/data flow, review implementation decisions, verify behavior, and do a small learning exercise where practical. This does not authorize new learning-system features in Phase 4.

### 8.6 Notes

- Phase 3 history in §5 is unchanged and remains the completed baseline.
- `api/mistakes/`, `api/deep-dive/`, and `api/progress/` are populated (Steps 5–7).
- Question-bank validation/seeding remains a Phase 2 completed concern, not a Phase 4 implementation prerequisite.
- The workflow above governs delivery only; `PROJECT_SPECIFICATION.md` is not part of the Phase 4 backend commit (owner-deferred / unrelated working-tree edits preserved). Spec §12.1 / §12.7 may still contain stale “pending Step 0 approval” wording — Phase 4 Development Order + this tracker §8 are authoritative for Phase 4.
- **Backend closeout (Steps 2–7):** re-verified 2026-10-24 on disposable `jsfluency_test` — `test:status` 10/10, `test:scheduling` 30/30, `test:prisma-guards` 1/1, `test:revision-write` 31/31, `test:mistakes` 12/12, `test:deep-dive` 11/11, `test:progress` 7/7; `prisma validate` OK. Migration `20261024163000_phase4_mistake_provenance` remains **local-only** until owner-authorized Neon `migrate deploy`.
- **Git:** `e4ef947` on `origin/master` (`feat: complete Phase 4 backend APIs`). No production Neon migrate or manual deploy initiated by this closeout.
- **Step 2 delivered:** `mapG5OutcomeToTopicStatus`, `retainStatusWithoutCompletedSession`, `STATUS_POLICY_VERSION` (`phase4-status-v1`).
- **Step 3 delivered:** Mistake nullable `questionId` / `sessionId` / unique `sourceSessionLogId` / `resolvedAt`; SetNull FKs; migration `20261024163000_phase4_mistake_provenance`. Validated on localhost disposable DBs only. **Do not assume Neon has this migration until an authorized production deploy.**
- **Step 4 delivered:** On first successful complete only — persist `Topic.status` via `phase4-status-v1`; ensure `DeepDiveNote` when RED; auto-create Mistakes for incorrect or correct+`DIDNT_UNDERSTAND` with `sourceSessionLogId` dedupe; extend complete JSON with `topicStatus` + `mistakesCreated`. G5 schedule writes unchanged. Duplicate/concurrent completes do not repeat Phase 4 writes.
- **Step 5 delivered:** Authenticated Mistake Log list/detail/manual-create/update-resolve under `api/mistakes`. Provenance (`sourceSessionLogId`, `sessionId`) rejected on create/update; optional create `questionId` must belong to topic; resolve via `resolved` boolean → `resolvedAt` (idempotent re-resolve). No hard-delete. Postman folder `05 - Mistake Log`.
- **Step 6 delivered:** Authenticated Deep Dive list (`RED` first, then `updatedAt` desc) + patch `reason`/`notes` + delete-by-`topicId` under `api/deep-dive`. Delete does not mutate Topic status/schedule; Step 4 ensure remains create-if-missing (no overwrite; recreate after explicit delete). Postman folder `06 - Deep Dive Queue`.
- **Step 7 delivered:** Authenticated read-only `GET /api/progress` with `statusCounts`, `deepDiveCount`, `unresolvedMistakeCount`, `dueCount`, `overdueCount`. Due/overdue reuse Kolkata helpers with the same semantics as Today’s Revision (`dueCount` includes overdue). No `DailyProgress` writes. Postman folder `07 - Progress Summary`.
- **Step 7 → Step 8 handoff:** FE-local types + API services for mistakes, deep dive, and progress (§2.5.6); reuse auth interceptor; no `shared-types/` (G8).
- **Known env caveat:** `test:revision-db` still fails the `inet_server_addr()` assertion on native Windows Postgres (`127.0.0.1/32` vs exact `127.0.0.1` / `172.*`); assertion not weakened.
