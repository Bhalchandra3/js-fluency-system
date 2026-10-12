# JavaScript Fluency System — Project Specification

> Authoritative product and architecture specification.
> Overall progress, completed-phase history, and handoff live in [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md).
> The complete working record for the active phase lives in [`CURRENT_STEP.md`](./CURRENT_STEP.md).
> Phase lifecycle and step-execution rules live in [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) §5.
> Archived originals: [`docs/archive/`](./docs/archive/).

---

## 1. Purpose and intended user

Build a simple web application that supports continuous JavaScript revision from fundamentals to advanced topics, with the primary goal of becoming job-ready as a **2-year Full Stack Developer**.

**Intended user:** a single owner (personal use). The product is a **personal revision and practice system**, not a multi-user course platform.

Studying must require very little effort to start. The app must work on laptop/desktop, mobile, and any modern browser, with the same learning progress available across devices via cloud deployment.

---

## 2. Goals

1. JavaScript fluency
2. Practical coding knowledge
3. Full-stack development readiness
4. Interview preparation
5. Consistent daily revision
6. Minimal friction when starting a study session

**Primary design principle:** reduce the effort required to start learning. Ideal flow: Open → Today’s Topic → Start → Answer → Next → Finish. Avoid multi-step configuration before study begins.

---

## 3. Learning philosophy

Core cycle:

```text
Recall → Answer → Check → Practice → Evaluate Understanding → Revise Later
```

Topic triage:

```text
Topic → Quick Revision → Do I understand it?
  ├── Yes → Schedule next revision
  ├── Somewhat → Practice
  └── No → Deep Dive
```

The user is not forced to study every topic in depth. Short revision comes first; deep study is reserved for weak topics.

---

## 4. Scope and non-goals

### In scope (product capabilities)

- Today’s Revision as the default entry experience
- Commute (mobile) and Laptop study modes
- Spaced revision intervals (initial: 1 / 3 / 7 / 14 / 30 days)
- Topic status: Green / Yellow / Red
- Dashboard focused on “what should I do right now?”
- Revision sessions with feedback and confidence capture
- Deep Dive queue with owner notes/resources
- Mistake log (mistakes may become future questions)
- Practice distinct from simple revision
- JavaScript roadmap (initial) and eventual multi-area learning
- Persistent cloud data and laptop ↔ mobile sync
- Responsive mobile-first UI and usable laptop layout
- Deployment on Vercel

### Non-goals (do not build initially)

- Social features, leaderboards, gamification
- Complex analytics
- AI-generated curriculum as a dependency
- Community features, subscriptions, notifications

### Explicit product constraints

- Not a full online course
- Core learning must work **without** in-app AI; AI may enhance later
- Exact confidence → status algorithm may be refined later

---

## 5. Functional requirements

### 5.1 Main user flow

On open, show **Today’s Revision** (topic, estimate, Start). The app chooses the next revision; the user should not need to search, browse, or configure a session to begin.

### 5.2 Study modes

| Mode | Intent | Characteristics |
|---|---|---|
| **Commute** | Mobile, short sessions | No coding environment; concept recall; output prediction; MCQ; short answer; ~5–15 minutes |
| **Laptop** | Deeper practice | Coding; output prediction; small implementations; debugging; interview-style; longer sessions |

These map to seed/session types `REVISION` (commute) and `PRACTICE` (laptop) in the data model.

### 5.3 Daily revision system

Each topic has a revision schedule. Initial intervals: Day 1 → 3 → 7 → 14 → 30. Successful revision advances the interval. Struggle path: Fail/Weak → Practice → Deep Dive → return to Day 1 cycle. Configurable intervals are a later enhancement.

### 5.4 Topic status

| Status | Meaning | Action |
|---|---|---|
| **Green** | Strong: explain, recognize, use, basic interview answers | Schedule next revision |
| **Yellow** | Basic understanding; weak on code/output/explanation/application | Add practice |
| **Red** | Insufficient understanding | Add to Deep Dive Queue |

### 5.5 Dashboard

Primary screen. Answers “What should I do right now?” Shows today’s progress, today’s revision CTA, due list, and deep-dive summary. Keep it simple; avoid statistics overload.

### 5.6 Revision session

Show topic, question progress (e.g. 1/5), answer + check, short explanation, confidence controls (Easy / Okay / Difficult / Didn’t understand), then Next. Confidence should influence topic status (exact algorithm later).

### 5.7 Deep Dive queue

Dedicated list of topics needing deeper study, with reason and owner notes/resources.

### 5.8 Mistake log

Record topic, mistaken understanding, and correct understanding. System should be able to turn mistakes into future revision questions.

### 5.9 Practice system

Separate from simple revision. Categories include: Concept, Output Prediction, Code Writing, Debugging, Problem Solving, Interview Question, Real-World Usage.

### 5.10 Mobile and laptop

**Mobile-first:** responsive layout, large touch targets, minimal navigation, fast load, readable code, no horizontal scroll, dark/light theme, one-hand session comfort. Prioritize Today’s Revision, Questions, Progress, Deep Dive.

**Laptop:** clearer question/explanation layout, better code presentation, longer practice, dashboard stats, roadmap navigation. Same data as mobile.

### 5.11 Data synchronization

Persistent data should eventually include topics, questions, revision history, topic status, confidence, mistakes, deep-dive topics, practice history, and daily progress. Architecture must support laptop ↔ cloud ↔ mobile continuity.

> Historical note: the original product text mentioned a `User` entity. The **current locked architecture** is single-user with no `User` model (see §7).

### 5.12 Deployment

- Host on **Vercel**
- HTTPS, mobile-accessible URL, responsive web app
- Secure environment variables
- Separate production and development environments
- Avoid unnecessary infrastructure in the initial version

---

## 6. Learning roadmap

### 6.1 Initial JavaScript roadmap (product requirement)

Implemented seed data lives in [`prisma/seed-data/topics.json`](./prisma/seed-data/topics.json) (52 topics). Categories:

**Fundamentals (10):** Variables, Data Types, Operators, Type Coercion, Equality, Conditionals, Loops, Functions, Scope, Hoisting

**Core JavaScript (15):** Arrays, Objects, Strings, Destructuring, Spread, Rest, Callbacks, Higher-Order Functions, Array Methods, Object Methods, this, Arrow Functions, Closures, Modules, Error Handling

**Asynchronous JavaScript (13):** Synchronous vs Asynchronous, Call Stack, Event Loop, Web APIs, Microtasks, Macrotasks, Promises, async/await, Promise.all, Promise.allSettled, Promise.race, Promise.any, Fetch

**Advanced JavaScript (14):** Execution Context, Lexical Environment, Prototype, Prototype Chain, Classes, Inheritance, Iterators, Generators, Map, Set, WeakMap, WeakSet, Memory Management, Garbage Collection

### 6.2 Future learning areas

Same revision system should eventually support TypeScript, Angular, Node.js, Express, Database, REST/HTTP, Git, Testing, RxJS, NgRx, System/Application Design, Problem Solving, Interview Preparation. JavaScript remains the primary area for MVP.

---

## 7. Locked architecture and technology

Original product direction recommended Angular, TypeScript, SCSS/CSS, Vercel, and Git/GitHub, and deferred backend/database selection. The following decisions are **current and locked** for implementation:

| Decision | Choice | Reasoning |
|---|---|---|
| Scope | Single-user (owner only) | Removes signup/login/password-reset |
| Auth | Single bearer token: server `BEARER_TOKEN` env; client localStorage after one-time setup | Cross-device sync without a user system |
| Frontend | Angular + TypeScript + SCSS (standalone, zoneless) | Matches original direction |
| Hosting | Vercel (Hobby / free tier) | Personal non-commercial use |
| Backend | Vercel serverless functions (Node/TypeScript) | Deploys with frontend |
| Database | Neon PostgreSQL | Relational model; free tier |
| ORM | Prisma (v7 line) | Type-safe TS; schema as documentation |
| Question content | AI-assisted seed bank in versioned JSON, loaded by `prisma/seed.ts` | Generated only after schema lock |
| Cost target | $0 across the stack | Confirmed as the operating target |

### Engineering notes preserved from implementation history

- No `User` model; `area` / `category` are plain strings on `Topic`.
- Prisma 7: datasource URL in `prisma.config.ts` (not `schema.prisma`); secrets in `.env` / `.env.local` (gitignored).
- Production URL (Phase 1): `https://js-fluency-system.vercel.app`.
- `/api/health` is intentionally unauthenticated and DB-backed.
- Authenticated APIs use bearer validation (`api/_lib/auth.ts`).

Question-bank JSON field rules are **not** duplicated here. Authoritative contract:

[`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md)

---

## 8. Permanent engineering constraints

1. Preserve the single-user architecture unless this specification is explicitly changed.
2. Never hard-code or expose production secrets (especially bearer tokens or database URLs) in source, docs, logs, or screenshots.
3. Never commit secrets; keep them in environment configuration only.
4. Prefer reproducible seed scripts over manual database inserts; keep seed **content** separate from seed **loader** logic.
5. Do not regenerate or redesign the Prisma schema without checking this specification and the existing schema first.
6. Do not generate question content against an unlocked schema.
7. Reuse existing project conventions before introducing new libraries, patterns, or infrastructure.
8. Avoid speculative schema fields (e.g. `difficulty`, `hints`) unless required by this specification and the locked data model.
9. Core learning must not depend on in-app AI.
10. Keep the stack simple; do not add infrastructure before the learning experience needs it.

Phase lifecycle and step-execution rules (order, verification, status updates, handoff) live in [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) §5.

---

## 9. MVP boundaries

### MVP must include

1. Dashboard
2. JavaScript roadmap
3. Topic list
4. Topic details
5. Daily revision
6. Question/answer flow
7. Confidence selection
8. Topic status
9. Revision scheduling
10. Deep Dive queue
11. Mistake log
12. Responsive mobile + desktop UI

### Future AI integration (post-MVP enhancement)

Optional later: generating revision questions, explanations, practice problems, mistake analysis, interview questions, difficulty adjustment, weak-topic identification. Not required for basic operation.

---

## 10. Success criteria

1. Open and start studying immediately.
2. Usable in a 5–10 minute commute.
3. Continue the same learning state from laptop.
4. No need to decide what to study.
5. Weak topics get more attention automatically.
6. Strong topics are scheduled further out.
7. Clear view of what to revise today.
8. Mistakes are trackable.
9. Gradual progress from fundamentals to advanced JavaScript.
10. Supports the job-ready 2-year Full Stack Developer goal.

---

## 11. Incremental delivery (phase intent)

Build incrementally so each phase yields a usable application:

| Phase | Intent (product) | Implementation framing (tracker) |
|---|---|---|
| 1 | Usable foundation toward daily study | Skeleton: Angular, Prisma, Neon, Vercel, `/api/health` |
| 2 | Topics + questions | Seeded topics/questions + authenticated topics API |
| 3 | Revision scheduling | Spaced repetition + Today’s Revision |
| 4 | Progress + mistakes | Confidence, status algorithm, Mistake Log, Deep Dive |
| 5 | Persistent cloud data | Full laptop ↔ mobile sync verification |
| 6 | Mobile optimization | Responsive/touch/theme polish |
| 7 | AI assistance | Optional in-app AI enhancements |

Detailed status and Phase 2 steps: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md).

---

## 12. Missing or unresolved requirements

Recorded explicitly so they are not invented later:

1. **Exact confidence → Green/Yellow/Red algorithm** — specified directionally; algorithm deferred.
2. **Configurable revision intervals** — “eventually”; not MVP-locked.
3. **`GET /api/questions`** — optional for Phase 2 close; may be required by Phase 3.
4. **Client one-time bearer setup UX** — decided in architecture; UI details not fully specified.
5. **Dark/light theme** — required for mobile; visual design tokens not specified.
6. **Multi-area roadmap (TypeScript, Angular, etc.)** — future; only JavaScript roadmap is initial.
7. **Turning mistakes into questions** — required capability; automation details open.

When resolving these, update this specification and the tracker; do not rely on chat history alone.

---

## 13. Related documents

| Document | Role |
|---|---|
| [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) | Overall progress, completed-phase history, major decisions, conclusions, next-phase handoff; lifecycle rules in §5 |
| [`CURRENT_STEP.md`](./CURRENT_STEP.md) | Complete working record for the entire active phase |
| [`LOCAL_README.md`](./LOCAL_README.md) | Local development runbook |
| [`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md) | Question-bank JSON contract |
| [`docs/archive/`](./docs/archive/) | Pre-consolidation specification and history sources |
