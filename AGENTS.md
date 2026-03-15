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

### 1. Modifying Schemas or Types (if needed)

If your change involves modifying or adding webpack configuration options:

1. Edit `schemas/WebpackOptions.json` (or relevant schema file in `schemas/plugins/`)
2. Run `yarn fix:special` to regenerate:
   - `types.d.ts` (compiled from JSDoc + schemas)
   - Precompiled schema validators
   - Runtime code
3. Now `lib/` code can reference the updated types via JSDoc `@typedef {import("...")}` imports

### 2. Making Changes to `lib/`

Modify source code in `lib/` as needed. If step 1 was performed, the latest type definitions are already available.

### 3. Writing Tests

Test files live in `test/` with naming conventions:

- `*.unittest.js` — Unit tests
- `*.basictest.js` — Basic integration tests
- `*.test.js` — Full integration tests
- `*.longtest.js` — Long-running tests

**Test case directories:**

- `test/cases/` — Compilation test cases (each subdirectory is a test case with `index.js` + optional `webpack.config.js`)
- `test/configCases/` — Config-driven test cases (each has `webpack.config.js` + test files)
- `test/statsCases/` — Stats output snapshot tests
- `test/watchCases/` — Watch mode test cases (file change detection, incremental rebuild)
- `test/hotCases/` — HMR (Hot Module Replacement) test cases
- `test/benchmarkCases/` — Performance benchmark cases (each has `index.js` + `webpack.config.mjs` + optional `options.mjs` with `setup()`)
- `test/*.unittest.js` — Unit tests using Jest directly (e.g., `test/FileSystemInfo.unittest.js` uses `memfs` for filesystem mocking)

### 4. Running Tests

Only run tests when test files are modified or explicitly requested.

**Choose test command based on modified directory:**

| Modified directory/file | Command                                                  |
| ----------------------- | -------------------------------------------------------- |
| `test/*.unittest.js`    | `yarn test:base -- --testPathPattern="<filename>"`       |
| `test/cases/`           | `yarn test:basic`                                        |
| `test/configCases/`     | `yarn test:basic -- --testPathPattern="ConfigTestCases"` |
| `test/statsCases/`      | `yarn test:basic -- --testPathPattern="StatsTestCases"`  |
| `test/watchCases/`      | `yarn test:base -- --testPathPattern="WatchTestCases"`   |
| `test/hotCases/`        | `yarn test:base -- --testPathPattern="HotTestCases"`     |
| `test/benchmarkCases/`  | `FILTER="<case-name>" yarn benchmark`                    |

### 5. Adding a Changeset

Every user-facing change needs a changeset file:

```bash
# Create .changeset/<descriptive-name>.md with this format:
---
"webpack": patch    # or minor / major
---

Description of the change.
```

Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes.

### 6. Updating Examples (if needed)

If WebpackOptions were added or modified, consider adding or updating relevant examples in `examples/`. Run `yarn build:examples` to ensure the examples build successfully.

### 7. Linting and Formatting

Run linting and formatting as the final step:

```bash
yarn fix:code      # ESLint autofix
yarn fmt           # Prettier format
```

If any `lib/` file's exports (public API) were modified, also run `yarn fix:special` to regenerate types and validators. Or use `yarn fix` which combines all three (`fix:code` + `fix:special` + `fmt`).
