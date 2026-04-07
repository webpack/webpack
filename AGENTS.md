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

### 6. Git Commit

Do **NOT** add `Co-authored-by` lines in commit messages. The GitHub CLA bot requires the email to map to a real GitHub account, and unrecognized emails will cause CLA check failures.
