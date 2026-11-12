# JavaScript Fluency System — Phase 2 Development Order

> This document defines the implementation order for Phase 2 of the JavaScript Fluency System.
> It is intended to be used as a development tracker and as context for any LLM/AI assistant working on the project.
>
> **Rule:** Complete and verify each step before moving to the next step unless a step explicitly depends on work that can be done in parallel.

---

## 1. Phase 2 Objective

Phase 2 establishes the application's initial learning data and the first authenticated API flow.

By the end of Phase 2:

- The `Topic` and `Question` Prisma models are finalized and treated as locked for this phase.
- The JavaScript learning roadmap has been converted into database-ready topics.
- The question-bank format is finalized.
- Topics and questions can be reproducibly seeded into Neon.
- Bearer-token authentication works correctly.
- `GET /api/topics` is implemented and authenticated.
- The deployed API returns real seeded data.
- The production database/API flow has been smoke-tested end-to-end.
- The project is ready to begin Phase 3: spaced-repetition scheduling and Today's Revision.

---

# 2. Phase 2 Execution Order

## Step 1 — Finalize the Prisma Data Model

### Objective

Confirm that the current Prisma schema contains everything required for the Phase 2 topic/question data before any seed data or question-bank content is generated.

### Tasks

- Inspect the current `prisma/schema.prisma`.
- Review the `Topic` model.
- Review the `Question` model.
- Review the `Topic` → `Question` relationship.
- Confirm all required fields.
- Confirm enum usage where applicable.
- Confirm whether fields such as the following are actually required:
  - `difficulty`
  - `hints`
  - `codeSnippet`
  - `explanation`
  - `expectedAnswer`
  - `questionFormat`
- Avoid adding speculative fields that are not required by the current product specification.
- Confirm that the existing models continue to support the later revision, mistake, progress, and spaced-repetition phases.

### Completion Criteria

- `Topic` model is finalized.
- `Question` model is finalized.
- Relationships are finalized.
- No known Phase 2 requirement is missing.
- Any required schema migration has been created/applied.
- Schema is explicitly marked **locked for Phase 2**.

### Important Rule

Do **not** generate the AI question bank before this step is complete.

---

## Step 2 — Finalize the Question-Bank Format

### Objective

Decide exactly how generated question content will be stored before generating the actual questions.

### Recommended structure

Use a version-controlled JSON content file loaded by Prisma:

```text
prisma/
├── schema.prisma
├── seed.ts
├── seed-data/
│   └── questions.json
└── migrations/
```

### Responsibilities

- `questions.json`
  - Contains question-bank content.
  - Contains no database connection logic.
  - Contains only data required by the finalized schema.

- `seed.ts`
  - Reads the seed data.
  - Resolves topic relationships.
  - Inserts/updates records through Prisma.
  - Handles duplicate/repeated seed execution safely.

### Completion Criteria

- JSON structure is documented.
- Every JSON property maps to a finalized `Question` field or required seed relationship.
- Topic references have a clearly defined strategy.
- The format is suitable for future question-bank additions.

### Decision

**Use JSON seed data + `prisma/seed.ts` loader.**

### Locked JSON contract (source of truth)

The explicit Phase 2 question-bank JSON contract is documented in:

```text
prisma/seed-data/QUESTION_BANK_FORMAT.md
```

Key locked rules:

- Root shape: top-level JSON array (not wrapped in an object).
- Topic reference: `topicSlug` matching a slug from `prisma/seed-data/topics.json`.
- No JSON `id` / `topicId` / `seedId` / `difficulty` / `hints`.
- Content fields: `sessionType`, `format`, `prompt`, optional `options`, `correctAnswer`, `explanation`, `codeSnippet`.
- `MULTIPLE_CHOICE.options`: array of choice strings.
- `MULTIPLE_CHOICE.correctAnswer`: zero-based option index encoded as a string.
- Coverage: minimum 5 questions per topic (minimum 260 questions for 52 topics).
- No Prisma schema changes are required for this contract.

---

## Step 3 — Build the Topic Roadmap Seed Data

### Objective

Convert the learning roadmap from the original product specification (§13) into concrete database-ready topics.

### Tasks

- Extract the required learning areas from spec §13.
- Create the initial topic list.
- Populate:
  - topic name
  - area
  - category
  - any other fields required by the finalized `Topic` model
- Keep `area` and `category` as plain strings, as previously decided.
- Preserve the roadmap hierarchy/meaning from the specification.
- Do not generate questions yet.

### Recommended location

```text
prisma/
└── seed-data/
    └── topics.json
```

### Completion Criteria

- All required initial roadmap topics are represented.
- Topic names are consistent and unique where uniqueness is required.
- Every topic can be referenced by future questions.
- The topic data matches the finalized Prisma schema.

---

## Step 4 — Implement `prisma/seed.ts`

### Objective

Create the reproducible database seeding mechanism for Topics and Questions.

### Tasks

- Configure the Prisma seed script.
- Load topic seed data.
- Load question seed data when available.
- Create/update topics.
- Resolve question → topic relationships.
- Insert questions.
- Prevent duplicate records when the seed is run repeatedly.
- Handle invalid topic references clearly.
- Keep database credentials out of source-controlled files.

### Completion Criteria

Running the seed script:

1. Connects to Neon successfully.
2. Creates/updates the expected Topics.
3. Creates Questions when question data is present.
4. Does not create unintended duplicates.
5. Fails clearly if seed data is invalid.

---

## Step 5 — Seed and Verify Neon

### Objective

Load the initial learning data into the Neon database and verify the stored data.

### Tasks

- Run the Prisma seed process against the intended Neon environment.
- Verify the Topic records.
- Verify Topic counts.
- Verify Question counts after questions are loaded.
- Verify Topic → Question relationships.
- Use Prisma Studio or controlled database queries for verification.

### Completion Criteria

- Expected Topics exist in Neon.
- Questions exist after the question-bank step is completed.
- Questions reference valid Topics.
- No unexpected duplicate records exist.
- Database contains real learning data rather than placeholder data.

---

## Step 6 — Verify Bearer-Token Authentication

### Objective

Ensure the server-side bearer-token authentication mechanism is correct before exposing real data through authenticated endpoints.

### Relevant file

```text
api/_lib/auth.ts
```

### Tasks

- Review the existing authentication helper.
- Confirm the token is read from the `Authorization` header.
- Confirm the expected `Bearer <token>` format.
- Confirm comparison is against the server-side environment variable.
- Confirm missing tokens are rejected.
- Confirm invalid tokens are rejected.
- Confirm valid tokens are accepted.
- Ensure the secret is never returned in API responses or committed to Git.

### Expected behavior

| Request | Expected result |
|---|---|
| No `Authorization` header | `401 Unauthorized` |
| Invalid bearer token | `401 Unauthorized` |
| Valid bearer token | Request proceeds |

### Completion Criteria

Authentication behavior is deterministic and reusable by future protected API routes.

---

## Step 7 — Build `GET /api/topics`

### Objective

Create the first real authenticated API endpoint.

### Recommended file

```text
api/topics/index.ts
```

### Endpoint

```text
GET /api/topics
```

### Tasks

- Apply the bearer-token authentication middleware/helper.
- Query Topics through Prisma.
- Return real database data.
- Keep the first implementation simple.
- Use the shared TypeScript types where appropriate.
- Return appropriate HTTP status codes.
- Use the existing shared error-response approach.

### Initial behavior

```text
GET /api/topics
        ↓
Bearer-token validation
        ↓
Prisma
        ↓
Neon PostgreSQL
        ↓
Topic records
        ↓
JSON response
```

### Completion Criteria

- Endpoint exists.
- Endpoint is authenticated.
- Valid requests return real Topics.
- Invalid/unauthenticated requests are rejected.
- Database errors produce controlled API responses.

---

## Step 8 — Test `GET /api/topics` Locally

### Objective

Verify the complete local request path before deploying the new endpoint.

### Test cases

#### Case 1 — No token

```text
GET /api/topics
```

Expected:

```text
401 Unauthorized
```

#### Case 2 — Incorrect token

```text
Authorization: Bearer <wrong-token>
```

Expected:

```text
401 Unauthorized
```

#### Case 3 — Correct token

```text
Authorization: Bearer <correct-token>
```

Expected:

```text
200 OK
```

with real Topic data.

### Completion Criteria

All three cases behave as expected.

---

## Step 9 — Generate the AI Question Bank

### Objective

Generate the initial question content against the already-locked Prisma schema and topic structure.

### Preconditions

Do not start this step until:

- Step 1 is complete.
- Step 2 is complete.
- Step 3 is complete.
- Topic identifiers/references are known.
- The JSON structure is finalized.

### Tasks

- Generate questions covering the initial roadmap.
- Follow the finalized question schema exactly.
- Assign every question to an existing Topic.
- Use the finalized `questionFormat`.
- Include difficulty/answer/explanation/code-related fields only when supported by the schema.
- Keep question content appropriate for the learning/revision workflow.
- Validate the generated JSON before loading it into Neon.

### Completion Criteria

- Question-bank JSON is structurally valid.
- Every question maps to a valid Topic.
- No unsupported properties are present.
- Question content is ready for seeding.

---

## Step 10 — Load Questions Through the Seed Process

### Objective

Use the established Prisma seed mechanism to load the generated question bank.

### Tasks

- Place the generated content in the agreed seed-data location.
- Run `prisma/seed.ts`.
- Verify inserted questions.
- Verify every question has a valid Topic relationship.
- Verify repeated seed execution does not create unintended duplicates.

### Completion Criteria

- Question bank is present in Neon.
- Topic/question relationships are valid.
- Seed process remains reproducible.

---

## Step 11 — Deploy and Verify Authentication in Production

### Objective

Confirm that the authentication flow works against the deployed Vercel API, not only locally.

### Tasks

Deploy the current changes to Vercel.

Test the production endpoint:

```text
GET /api/topics
```

Test:

1. No token.
2. Invalid token.
3. Valid token.

### Expected results

| Production request | Expected |
|---|---|
| No token | `401` |
| Wrong token | `401` |
| Correct token | `200` + real topics |

### Important Check

Confirm the production environment contains the correct server-side bearer-token variable.

Do not expose the production token in frontend source code, Git, logs, screenshots, or documentation.

---

## Step 12 — Production Smoke Test

### Objective

Verify that Phase 2 works as a complete production data flow.

### Verify

```text
Client
  ↓
Vercel API
  ↓
Bearer-token authentication
  ↓
Prisma
  ↓
Neon PostgreSQL
  ↓
Seeded Topics / Questions
  ↓
JSON response
```

### Minimum smoke tests

- `/api/health` still works.
- Unauthenticated `/api/topics` is rejected.
- Authenticated `/api/topics` returns real Topics.
- Seeded Questions exist in Neon.
- Questions reference valid Topics.
- No production-only Prisma/module-resolution errors occur.
- Existing Phase 1 functionality remains intact.

### Optional

A question retrieval endpoint such as:

```text
GET /api/questions
```

can be added if required by the Phase 3 implementation.

It is **not mandatory for closing Phase 2** unless the final architecture requires it.

---

# 3. Phase 2 Completion Criteria

Phase 2 can be marked **complete** only when all of the following are true:

- [ ] `Topic` Prisma model finalized.
- [ ] `Question` Prisma model finalized.
- [ ] Phase 2 schema changes migrated successfully, if any.
- [ ] Question-bank format finalized.
- [ ] Initial Topic roadmap created.
- [ ] `prisma/seed.ts` implemented.
- [ ] Topics seeded into Neon.
- [ ] AI question bank generated.
- [ ] Questions seeded into Neon.
- [ ] Topic → Question relationships verified.
- [ ] Bearer-token authentication verified locally.
- [ ] `GET /api/topics` implemented.
- [ ] `GET /api/topics` verified locally.
- [ ] `GET /api/topics` deployed.
- [ ] Production authentication verified.
- [ ] Production API returns real Topic data.
- [ ] Production database contains real Topic/Question data.
- [ ] Phase 1 health endpoint remains functional.
- [ ] No unresolved Phase 2 data/API blockers remain.

---

# 4. Phase 2 → Phase 3 Handoff

Once Phase 2 is complete, the next phase is:

## Phase 3 — Revision Scheduling

Phase 3 will focus on:

- Spaced repetition intervals:
  - 1 day
  - 3 days
  - 7 days
  - 14 days
  - 30 days
- Determining what is due for revision today.
- Revision session flow.
- Answer submission.
- Confidence capture.
- Updating the next revision date.
- Today's Revision API.
- Today's Revision Angular screen.
- Initial dashboard data.

Phase 3 must build on the finalized Topic/Question data model and the authenticated API infrastructure established in Phase 2.

---

# 5. Development Rules for Future LLM/AI Assistants

When continuing this project, an AI assistant should follow these rules:

1. **Read this document before modifying Phase 2 work.**
2. **Do not skip the execution order without a technical reason.**
3. **Do not regenerate or redesign the Prisma schema without checking the existing schema and product specification first.**
4. **Do not generate question content against an unlocked schema.**
5. **Prefer reproducible seed scripts over manual database inserts.**
6. **Keep seed content separate from database-loading logic.**
7. **Never hard-code production secrets.**
8. **Never expose the bearer token in frontend source code.**
9. **Test authenticated API behavior with missing, invalid, and valid tokens.**
10. **Test production behavior separately from local behavior.**
11. **Do not mark a Phase 2 task complete based only on code creation; verify the behavior.**
12. **Preserve the single-user architecture unless the project specification is explicitly changed.**
13. **Reuse existing project conventions before introducing new libraries, patterns, or infrastructure.**
14. **Avoid unnecessary schema fields or abstractions that are not required by the current product requirements.**
15. **When a decision is made during development, update the project's technical decision/progress tracker so future development does not rely on conversation history alone.**

---

# 6. Current Starting Point

At the beginning of this Phase 2 execution plan:

- Phase 1 is complete.
- Angular application is scaffolded.
- Prisma is configured.
- Neon PostgreSQL is connected.
- Initial Prisma migration exists.
- Vercel production deployment works.
- `/api/health` works against the production database.
- Prisma Client generation/deployment issues encountered during Phase 1 have been resolved.
- The next implementation task is **Step 1: finalize the `Topic` and `Question` Prisma models**.

**Current Phase:** Phase 2 — Topics + Questions

**Current Step:** Step 1 — Finalize Prisma Data Model

**Next Phase:** Phase 3 — Revision Scheduling
