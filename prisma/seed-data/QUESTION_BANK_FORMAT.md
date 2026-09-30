# Question-Bank JSON Format (Phase 2 — Locked Contract)

This document is the explicit source of truth for `prisma/seed-data/questions.json`.

It is constrained by the finalized Phase 2 Prisma schema in `prisma/schema.prisma`.
It does **not** require schema changes.

Related files:

- Content file (created in Step 9): `prisma/seed-data/questions.json`
- Topic references resolve against: `prisma/seed-data/topics.json`
- Future loader (Step 10): `prisma/seed.ts`

---

## 1. Root JSON shape

`questions.json` MUST be a top-level JSON array:

```json
[
  { }
]
```

Do **not** wrap the array in an object such as `{ "questions": [...] }`.

---

## 2. Topic reference

Every question MUST include:

```json
"topicSlug": "<existing topic slug>"
```

Rules:

- `topicSlug` MUST exactly match a `slug` value from `prisma/seed-data/topics.json`.
- Do **not** use `topicId` (database IDs must not be hard-coded into version-controlled seed data).
- Do **not** use `topicName` (names are less stable than slugs).

`topicSlug` is a seed-only relationship key. The future seed loader resolves it to `Topic.id` and stores `topicId` in the database.

---

## 3. Question identity

Do **not** include an `id` field in the JSON.

- Prisma generates `Question.id` in the database.
- Do not add a seed ID field.
- Do not modify the Prisma schema to introduce a seed-owned ID.

---

## 4. Allowed JSON fields

Each array element represents one seed question.

### Required fields

| JSON field | Maps to | Notes |
|---|---|---|
| `topicSlug` | seed → `Topic.slug` → `Question.topicId` | Seed-only reference key |
| `sessionType` | `Question.sessionType` | Must be a `SessionType` enum value |
| `format` | `Question.format` | Must be a `QuestionFormat` enum value |
| `prompt` | `Question.prompt` | Question / task text |

### Optional fields (nullable in schema)

| JSON field | Maps to | Notes |
|---|---|---|
| `options` | `Question.options` (`Json?`) | Required for `MULTIPLE_CHOICE`; omit otherwise |
| `correctAnswer` | `Question.correctAnswer` (`String?`) | Format-dependent; see below |
| `explanation` | `Question.explanation` (`String?`) | Prefer including why the answer is correct |
| `codeSnippet` | `Question.codeSnippet` (`String?`) | Include when the question requires code |

### Explicitly forbidden fields

Do **not** include:

- `id`
- `topicId`
- `seedId`
- `difficulty`
- `hints`
- `createdAt`
- `logs`
- any other field not listed above

---

## 5. Enum values (from `prisma/schema.prisma`)

### `SessionType`

- `REVISION`
- `PRACTICE`

### `QuestionFormat`

- `MULTIPLE_CHOICE`
- `SHORT_ANSWER`
- `OUTPUT_PREDICTION`
- `CODE_WRITING`
- `DEBUGGING`

Do not invent additional enum values.

`ConfidenceLevel` belongs to `SessionLog`, not `Question`, and MUST NOT appear in `questions.json`.

---

## 6. Format-specific rules

### `MULTIPLE_CHOICE`

- `options` MUST be an array of choice **strings**.
- `correctAnswer` MUST be the zero-based index of the correct option, encoded as a **string**.

Example (uses a real slug from `topics.json`):

```json
{
  "topicSlug": "data-types",
  "sessionType": "REVISION",
  "format": "MULTIPLE_CHOICE",
  "prompt": "Which value is returned by typeof null?",
  "options": [
    "null",
    "object",
    "undefined",
    "string"
  ],
  "correctAnswer": "1",
  "explanation": "typeof null returns \"object\" because of a long-standing historical quirk in JavaScript."
}
```

Rules:

- `"0"` means the first option, `"1"` the second, and so on.
- `correctAnswer` MUST be a valid index into `options`.
- Do not store option objects with separate IDs.
- Do not change the Prisma schema.

### `SHORT_ANSWER`

- Omit `options` (or leave it absent).
- `correctAnswer` SHOULD contain the expected reference answer text when deterministic checking is intended.
- `codeSnippet` only when the question genuinely requires code.

### `OUTPUT_PREDICTION`

- Prefer including `codeSnippet` with the code under inspection.
- `correctAnswer` SHOULD contain the expected output / result as a string.
- Omit `options` unless the question is intentionally multiple-choice (preferred format is non-MC output prediction).

### `CODE_WRITING`

- Prefer including `codeSnippet` when starter code, a partial implementation, or a required signature is part of the task.
- `correctAnswer` MAY contain a reference solution or key expected fragments.
- Omit `options`.

### `DEBUGGING`

- Prefer including `codeSnippet` with the buggy code.
- `correctAnswer` SHOULD describe the fix or corrected behavior/code.
- Omit `options`.

---

## 7. `codeSnippet` usage

Use `codeSnippet` whenever answering or reasoning requires a code sample.

Appropriate for:

- `OUTPUT_PREDICTION`
- `CODE_WRITING`
- `DEBUGGING`

May also be used for other formats when the question genuinely requires code.

Do **not** add unnecessary code snippets to purely conceptual questions.

---

## 8. Coverage and session mix (initial bank)

- Every topic in `topics.json` MUST have question coverage.
- Minimum coverage: **5 questions per topic**.
- With 52 topics, the minimum initial bank size is **260 questions**.
- More questions are allowed where useful; no topic may have fewer than 5.
- Use a practical mixture of `REVISION` and `PRACTICE`.
- Do not produce a bank that is accidentally 100% one `SessionType`.

---

## 9. Content quality

Questions must support the learning loop:

`recall → answer → check → practice → revise`

Prefer questions that test:

- JavaScript behavior
- reasoning
- output prediction
- debugging
- practical understanding
- code writing

Avoid:

- trivial wording variations
- near-duplicate questions
- ambiguous prompts with multiple equally valid answers
- unsupported APIs/frameworks unless the topic itself requires them

Explanations should explain **why** the answer is correct, not merely restate it.

---

## 10. Schema compatibility notes

This contract is compatible with the current Phase 2 `Question` model without schema changes:

| Contract element | Schema compatibility |
|---|---|
| `topicSlug` | Seed-only; resolved to `topicId` at seed time via `Topic.slug` |
| `sessionType` | Matches required `SessionType` |
| `format` | Matches required `QuestionFormat` |
| `prompt` | Matches required `String` |
| `options` | Matches nullable `Json?`; string arrays are valid JSON |
| `correctAnswer` | Matches nullable `String?`; index-as-string fits this type |
| `explanation` | Matches nullable `String?` |
| `codeSnippet` | Matches nullable `String?` |
| No JSON `id` | Matches DB-owned `@default(cuid())` |
| No `difficulty` / `hints` | Those fields do not exist on `Question` |

Future Step 10 seed logic MUST:

1. Validate every `topicSlug` against seeded topics.
2. Resolve `topicSlug` → `topicId`.
3. Persist only Prisma `Question` fields (not `topicSlug`).
4. Enforce MULTIPLE_CHOICE index/`correctAnswer` consistency.
5. Remain safe to re-run without unintended duplicate questions (implementation detail of Step 10; not a schema change).

---

## 11. Status

- Contract status: **documented and locked for Phase 2 Step 9 generation**
- `questions.json`: **not created yet** (created in Step 9)
- Schema changes required: **none**
