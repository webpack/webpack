# Webpack Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

## Project Overview

webpack is a JavaScript module bundler. Package manager: **yarn**.

- `lib/` — Main source code
- `lib/javascript/` — JavaScript modules parsing and generation
- `lib/css/` — CSS modules parsing and generation
- `schemas/` — JSON schemas for webpack options
- `test/` — All tests
- `examples/` — Usage examples for webpack features and configuration options
- `.changeset/` — Changeset files for releases
- `types.d.ts` — Auto-generated type definitions (do not edit manually)
- `package.json` — All available commands (defined in `scripts`)

## Development Workflow

### 1. Making Changes to `lib/` (and schemas if needed)

Modify source code in `lib/` as needed.

If your change involves modifying or adding webpack configuration options:

1. Edit `schemas/WebpackOptions.json` (or relevant schema file in `schemas/plugins/`)
2. Run `yarn fix:special` to regenerate:
   - `types.d.ts` (compiled from JSDoc + schemas)
   - Precompiled schema validators
   - Runtime code
3. Now `lib/` code can reference the updated types via JSDoc `@typedef {import("...")}` imports

### 2. Writing and Running Tests

**For bug fixes, always write the test case first.** Run the test to confirm it fails, reproducing the bug. Then make the code change (step 1) and re-run the test — a passing test confirms the fix.

For new features, tests can be written alongside or after the implementation.

Only run tests when test files are modified or explicitly requested. See [TESTING_DOCS.md](TESTING_DOCS.md) for test directory structure, naming conventions, and how to run specific test cases.

### 3. Adding a Changeset

Every user-facing change needs a changeset file:

```bash
# Create .changeset/<descriptive-name>.md with this format:
---
"webpack": patch    # or minor / major
---

Description of the change.
```

Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes. Do not prefix the description with `fix:`, `feat:`, etc. — the change type is already indicated by `patch`/`minor`/`major`.

### 4. Updating Examples (if needed)

If WebpackOptions were added or modified, consider adding or updating relevant examples in `examples/`. Run `yarn build:examples` to ensure the examples build successfully.

### 5. Linting and Formatting

Run linting, formatting, and type checking as the final step:

```bash
yarn fix:code      # ESLint autofix
yarn fmt           # Prettier format
yarn tsc           # TypeScript type check (catches type errors in JSDoc annotations)
```

If any `lib/` file's exports (public API) were modified, also run `yarn fix:special` to regenerate types and validators. Or use `yarn fix` which combines all three (`fix:code` + `fix:special` + `fmt`).

### 6. Git Commit & Pull Request

#### Commit author identity (required for CLA)

EasyCLA matches the **commit author email** to a GitHub account with a signed CLA. A commit authored as `Claude`, `claude-bot`, `noreply@anthropic.com`, or any other unrecognized identity will fail the CLA check and block the PR.

Before the first commit of a task, set the author to the GitHub account that requested the work — never to a bot identity. Resolve the identity in this order:

1. An identity the user explicitly states in the task (`commit as alice <alice@example.com>`).
2. The requester's GitHub login + their public no-reply email: `<USER_ID>+<login>@users.noreply.github.com` (look up `USER_ID` via `mcp__github__get_me` or the GitHub REST API `/users/<login>`).
3. If neither is available, **ask** — do not guess and do not fall back to a bot identity.

Apply per-commit (preferred, no global side-effects):

```bash
git -c user.name="<login>" -c user.email="<email>" commit -m "…"
```

Do **NOT** add `Co-authored-by` lines — unrecognized co-author emails also break the CLA check.

#### Pull request body

webpack uses an **org-wide** PR template from the [`webpack/.github`](https://github.com/webpack/.github/blob/main/.github/pull_request_template.md) repository (there is no template file inside `webpack/webpack`). When opening a PR, fill **every** section of that template, in order, keeping the headings exactly as written:

- **Summary** — motivation and what problem is solved; link the related issue.
- **What kind of change does this PR introduce?** — one of: fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs.
- **Did you add tests for your changes?** — yes/no + which test files.
- **Does this PR introduce a breaking change?** — yes/no + migration path if yes.
- **If relevant, what needs to be documented…** — list doc updates or write `n/a`.
- **Use of AI** — required. State that Claude Code was used and how (e.g. "Claude Code drafted the implementation under human review"). Per the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md), omitting or misrepresenting this can get the PR closed.

Do not delete sections, do not reorder, do not strip the HTML comment hints — write the answer directly under each heading. If a section truly does not apply, write `n/a` under it.
