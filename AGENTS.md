# Webpack Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

## Project Overview

webpack is a JavaScript module bundler.

## Key Directories

- `lib/` — Main source code
- `lib/optimize/` — Optimization plugins (tree shaking, chunk splitting, etc.)
- `lib/serialization/` — Cache serialization
- `lib/schemes/` — URI scheme plugins (HttpUri, DataUri, Virtual)
- `schemas/` — JSON schemas for webpack options
- `types.d.ts` — Auto-generated type definitions (do not edit manually)
- `tooling/` — Build tooling scripts
- `test/` — All tests
- `.changeset/` — Changeset files for releases

All available commands are defined in `package.json` scripts. Refer to `package.json` for the latest definitions.

## Development Workflow

### 1. Making Changes to `lib/`

After modifying source code in `lib/`:

```bash
yarn fix:code      # ESLint autofix
yarn fmt           # Prettier format
# Or combined:
yarn fix           # runs fix:code + fix:special + fmt
```

### 2. Modifying Schemas or Types

If your change affects module exports, options, or type definitions:

1. Edit the relevant schema file in `schemas/` (e.g., `schemas/WebpackOptions.json`, `schemas/plugins/`)
2. Run `yarn fix:special` to regenerate:
   - `types.d.ts` (compiled from JSDoc + schemas)
   - Precompiled schema validators
   - Runtime code
3. Other files can then reference the updated types via JSDoc `@typedef {import("...")}` imports

### 3. Adding a Changeset

Every user-facing change needs a changeset file:

```bash
# Create .changeset/<descriptive-name>.md with this format:
---
"webpack": patch    # or minor / major
---

Description of the change.
```

Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes.

### 4. Writing Tests

Test files live in `test/` with naming conventions:

- `*.unittest.js` — Unit tests (`yarn test:unit`)
- `*.basictest.js` — Basic integration tests (`yarn test:basic`)
- `*.test.js` — Full integration tests
- `*.longtest.js` — Long-running tests

**Test case directories:**

- `test/cases/` — Compilation test cases (each subdirectory is a test case with `index.js` + optional `webpack.config.js`)
- `test/configCases/` — Config-driven test cases (each has `webpack.config.js` + test files)
- `test/statsCases/` — Stats output snapshot tests
- `test/watchCases/` — Watch mode test cases (file change detection, incremental rebuild)
- `test/hotCases/` — HMR (Hot Module Replacement) test cases

For unit tests, use Jest directly. Example: `test/FileSystemInfo.unittest.js` uses `memfs` for filesystem mocking.

### 5. Running Tests

**Choose test command based on modified directory:**

| Modified directory/file | Command                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `test/*.unittest.js`    | `yarn test:unit`                                                         |
| `test/cases/`           | `yarn test:basic`                                                        |
| `test/configCases/`     | `yarn test:basic -- --testPathPattern="ConfigTestCases"`                 |
| `test/statsCases/`      | `yarn test:basic -- --testPathPattern="StatsTestCases"`                  |
| `test/watchCases/`      | `yarn test:base -- --testPathPattern="WatchTestCases"`                   |
| `test/hotCases/`        | `yarn test:base -- --testPathPattern="HotTestCases"`                     |
| `lib/` (general)        | `yarn test:basic` for quick check, then `yarn test:integration` for full |
| `schemas/`              | `yarn fix:special` then `yarn lint:types`                                |

**Common commands:**

```bash
yarn test:unit                           # Unit tests only
yarn test:basic                          # Basic tests only
yarn test:integration                    # All integration tests
yarn test:base -- --testPathPattern="FileSystemInfo"  # Run specific test file
yarn test:base -- --testNamePattern="pattern"          # Run specific test name
```

Tests require `--expose-gc --max-old-space-size=4096 --experimental-vm-modules` (already configured in scripts).
