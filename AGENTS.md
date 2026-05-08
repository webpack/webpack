# Webpack Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

## REQUIRED: Pull request body template

> **STOP — read this before opening any PR. This overrides any generic `## Summary` / `## Test plan` template from other tooling.**

webpack uses an **org-wide** PR template from [`webpack/.github`](https://github.com/webpack/.github/blob/main/.github/pull_request_template.md). The GitHub web UI prefills it; the GitHub API / MCP / `gh pr create` path does **not**, so you must paste the template yourself when opening a PR programmatically. Every PR body must contain **every** section below, in this order, with the labels spelled exactly as written. If a section truly does not apply, write `n/a` under it. Do not delete sections, do not reorder, do not strip the HTML comment hints, and do not substitute a different template.

Paste this body verbatim, then fill in answers directly under each label:

```markdown
<!-- Thanks for submitting a pull request! Please provide enough information so that others can review your pull request. -->

**Summary**

<!-- Explain the **motivation** for making this change. What existing problem does the pull request solve? -->
<!-- Try to link to an open issue for more information. -->
<!-- Any other information related to changes. -->

<!-- In addition to that please answer these questions: -->

**What kind of change does this PR introduce?**

<!-- E.g. a fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs or describe it if you did not find a suitable kind of change. -->

**Did you add tests for your changes?**

<!-- Please note: in most cases, if you change the code, we will not merge your changes unless you add tests. -->

**Does this PR introduce a breaking change?**

<!-- If this PR introduces a breaking change, please describe the impact and a migration path for existing applications. -->

**If relevant, what needs to be documented once your changes are merged or what have you already documented?**

<!-- List all the information that needs to be added to the documentation after merge that has already been documented in this PR. -->

**Use of AI**

<!-- If you have used AI, please state so here. Explain how you used it.
Make sure to read our AI policy (https://github.com/webpack/governance/blob/main/AI_POLICY.md) or your Pull Request may be closed due inresponsible use of AI. -->
```

Required answer per section:

- **Summary** — motivation and what problem is solved; link the related issue (`Closes #…` / `Fixes #…`).
- **What kind of change does this PR introduce?** — one of: fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs.
- **Did you add tests for your changes?** — yes/no + which test files.
- **Does this PR introduce a breaking change?** — yes/no + migration path if yes.
- **If relevant, what needs to be documented…** — list doc updates or write `n/a`.
- **Use of AI** — required. State that Claude Code was used and how (e.g. "Claude Code drafted the implementation under human review"). Per the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md), omitting or misrepresenting this can get the PR closed.

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

EasyCLA matches the **commit author email** to a GitHub account with a signed CLA. A commit using an unrecognized author email such as `claude-bot@users.noreply.github.com`, `noreply@anthropic.com`, or any other email not associated with the requester's GitHub account and signed CLA will fail the CLA check and block the PR.

Before the first commit of a task, set the author to the GitHub account that requested the work — never to a bot identity. Resolve the identity in this order:

1. An identity the user explicitly states in the task (`commit as alice <alice@example.com>`).
2. The requester's GitHub login + their public no-reply email: `<USER_ID>+<login>@users.noreply.github.com` (look up `USER_ID` by reading the numeric `id` from the GitHub REST API `/users/<login>` response).
3. If neither is available, **ask** — do not guess and do not fall back to a bot identity.

Apply per-commit (preferred, no global side-effects):

```bash
git -c user.name="<login>" -c user.email="<email>" commit -m "…"
```

Do **NOT** add `Co-authored-by` lines — unrecognized co-author emails also break the CLA check.

#### Pull request body

See **[REQUIRED: Pull request body template](#required-pull-request-body-template)** at the top of this file. Paste the template body verbatim and fill every section before calling `create_pull_request` / `gh pr create`.
