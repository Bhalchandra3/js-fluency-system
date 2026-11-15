# AGENTS.md — JavaScript Fluency System

## Enforcement vs guidance

- `opencode.json` `permission` / agent `disable` settings are **enforcement**.
- This file is **behavioral guidance** for the model. It is not a security boundary.

## Default posture

1. Investigate read-only first (`read`, `glob`, `grep`, `list`).
2. Do not modify files unless the owner explicitly approves the change (OpenCode will also prompt on `edit`).
3. Do not start subagents or delegate via Task. Subagents are disabled; do not try to bypass that.
4. Never read or request secret files (`.env`, `.env.*`, credentials, tokens, private keys). `.env.example` is allowed if present.
5. Do not install packages, run migrations, seed/write the database, commit, push, or deploy unless the owner explicitly authorizes that exact action.
6. Work only on the **active step** in `CURRENT_STEP.md` when a phase is active (file cleared when none is). Follow that phase’s Development Order under `docs/archive/` or the root plan named in the tracker. One task at a time.
7. Do not invent file paths, command output, test results, or claims of completed work. If evidence is missing, stop and report what is missing.
8. If the same approach fails repeatedly, stop and report; do not loop.
9. Before reporting completion, state what was verified (commands/tests actually run) and what was not.
10. Never use auto-approve / `--auto`. Prefer reject over guessing when a permission prompt is unclear.
