# Webpack Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

## Conventions in this guide

A `> [!REQUIRED]` callout placed immediately under a heading marks that whole section as **mandatory**: follow it exactly, do not paraphrase, do not skip, do not substitute a similar-looking convention from other tooling. Sections without the callout are normal guidance — apply judgement.

## Project Overview

webpack is a JavaScript module bundler. Package manager: **yarn**.

**Source**

- `lib/` — Main source code (CommonJS only; types declared via JSDoc `@typedef`).
  - `lib/asset/` — Asset modules (images, fonts, raw files).
  - `lib/async-modules/` — Top-level await.
  - `lib/cache/` — Filesystem and memory caches.
  - `lib/config/` — Config defaults, normalization, target presets.
  - `lib/container/` — Module Federation.
  - `lib/css/` — CSS Modules, CSS parsing and generation.
  - `lib/debug/` — Debug helpers.
  - `lib/dependencies/` — `Dependency` classes and their templates (HarmonyImport, CommonJsRequire, RequireContext, …).
  - `lib/dll/` — DllPlugin / DllReferencePlugin.
  - `lib/electron/`, `lib/node/`, `lib/web/`, `lib/webworker/` — Target-specific runtime templates.
  - `lib/errors/` — Error class hierarchy.
  - `lib/esm/` — ESM-specific output (e.g. `import.meta`).
  - `lib/hmr/` — Hot Module Replacement plugins.
  - `lib/html/` — Experimental HTML support.
  - `lib/ids/` — Module/chunk id assignment plugins.
  - `lib/javascript/` — JavaScript parsing (acorn), generation, exports analysis.
  - `lib/json/` — JSON modules.
  - `lib/library/` — UMD/AMD/ESM/CommonJS library output formats.
  - `lib/logging/` — Logger API and console formatting.
  - `lib/optimize/` — Optimization plugins (`SplitChunksPlugin`, `ConcatenatedModule`, …).
  - `lib/performance/` — Asset/entrypoint size hints.
  - `lib/prefetch/` — Prefetch/preload plugins.
  - `lib/rules/` — `module.rules` matching engine.
  - `lib/runtime/` — Runtime modules emitted into bundles (chunk loaders, public-path, …).
  - `lib/schemes/` — Custom URL scheme handlers (`data:`, `http:`, …).
  - `lib/serialization/` — Persistent cache serialization.
  - `lib/sharing/` — Shared modules / Module Federation runtime.
  - `lib/stats/` — Stats output (default printer, JSON factories).
  - `lib/url/` — `new URL(asset, import.meta.url)` references.
  - `lib/util/` — Utility helpers.
  - `lib/wasm/`, `lib/wasm-async/`, `lib/wasm-sync/` — WebAssembly module support.
- `hot/` — Runtime code shipped to browsers for HMR (browser-side, not Node tooling).
- `bin/` — `webpack` CLI entry point.
- `tooling/` — Repo-internal build scripts (runtime/wasm code generators, hash-debug tool); invoked by `yarn fix:special`.
- `assembly/` — WebAssembly source for the hash function.
- `setup/` — One-time setup scripts.

**Schemas (the source of truth for webpack's config API)**

- `schemas/WebpackOptions.json` — top-level webpack options schema.
- `schemas/plugins/*.json` — per-plugin option schemas (`BannerPlugin`, `IgnorePlugin`, `ProgressPlugin`, `SourceMapDevToolPlugin`, …).
- `schemas/_container.json`, `schemas/_sharing.json` — Module Federation sub-schemas.

**Tests** — see [TESTING_DOCS.md](TESTING_DOCS.md) for naming and how to run a single case.

- `test/cases/` — Default-config compilation cases.
- `test/configCases/` — Cases with explicit `webpack.config.js`.
- `test/watchCases/` — Watch-mode incremental cases.
- `test/hotCases/` — HMR runtime cases.
- `test/statsCases/` — Stats output snapshots.
- `test/typesCases/` — TypeScript type assertions against `types.d.ts`.
- `test/test262-cases/` — JavaScript spec compliance (test262).
- `test/memoryLimitCases/`, `test/benchmarkCases/` — Heap-bounded and perf cases.
- `test/__snapshots__/`, `test/fixtures/`, `test/helpers/`, `test/harness/` — Snapshots and shared utilities.

**Examples & changesets**

- `examples/` — Usage examples (build with `yarn build:examples`).
- `.changeset/` — Pending changeset files for the next release.

**Auto-generated — do not edit by hand; regenerate via `yarn fix:special`**

- `types.d.ts` — Compiled from JSDoc + schemas.
- `schemas/**/*.check.{js,d.ts}` — Precompiled schema validators.
- Generated runtime code under `lib/` (driven by `tooling/generate-runtime-code.js`).

**Hand-maintained type declarations (these _are_ editable)**

- `declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`.

**Configuration**

- `package.json` — All commands (defined in `scripts`).
- `tsconfig*.json` — TypeScript configs (one per surface: `lib`, `hot`, types tests, validation, benchmarks).
- `eslint.config.mjs`, `cspell.json`, `jest.config.js`, `generate-types-config.js` — Lint/spell/test/type-gen configs.
- `.github/workflows/`, `.github/scripts/` — CI.

## Source language: CommonJS + JSDoc

`lib/` is CommonJS only. Use `module.exports` / `require()`, never `import`/`export` syntax. Types are declared via JSDoc — `@typedef {import("./Other")} Other` and friends — never TypeScript syntax inside `.js` files. The JSDoc annotations are compiled into `types.d.ts` by `yarn fix:special`.

## Auto-generated files

These files are produced by `yarn fix:special` and must not be edited by hand:

- `types.d.ts` — compiled from JSDoc + schemas.
- `schemas/**/*.check.{js,d.ts}` — precompiled schema validators.
- Generated runtime code under `lib/` (driven by `tooling/generate-runtime-code.js`).

After changing schemas, JSDoc on public exports, or runtime templates, run `yarn fix:special` instead of editing the outputs. The hand-maintained type declarations (`declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`) _are_ editable.

## Adding or renaming a webpack option

Adding or renaming a webpack option requires edits in every layer, in this order:

1. **Schema** — `schemas/WebpackOptions.json` (or `schemas/plugins/<Name>.json`).
2. **Defaults** — `lib/config/defaults.js`.
3. **Normalization** — `lib/config/normalization.js`.
4. **Implementation** — the site that consumes the option.

Skipping any layer silently breaks the option. The most common failure: the schema accepts the new key but `defaults.js` never sets it, so user code never reaches the new path.

## Running tests

Run targeted tests during development — `yarn jest test/<area>` or `yarn jest -t "<name>"`. The full suite is large, so don't run `yarn test` unless asked.

When updating snapshots (`yarn jest -u`), eyeball the diff first; never update blindly. See [TESTING_DOCS.md](TESTING_DOCS.md) for case structure and naming.

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

> [!REQUIRED]

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

> [!REQUIRED]

webpack uses an **org-wide** PR template from [`webpack/.github`](https://github.com/webpack/.github/blob/main/.github/pull_request_template.md). The GitHub web UI prefills it; the GitHub API / MCP / `gh pr create` path does **not**, so you must paste the template yourself when opening a PR programmatically. Every PR body must contain **every** section below, in this order, with the labels spelled exactly as written. If a section truly does not apply, write `n/a` under it. Do not delete sections, do not reorder, do not strip the HTML comment hints, and do not substitute a different template (e.g. `## Summary` / `## Test plan`).

If a PR already exists (e.g. it was opened from the GitHub web UI before you joined the task, or a human edited the body), agents must verify the body still matches the template before each push, and call `update_pull_request` to re-paste any missing section. Treat the PR body the same way you treat the commit message: every push is also a chance to fix a drifted PR body.

Paste the body **inside** the fenced block below — only the lines between the ` ```markdown ` opener and the closing ` ``` ` (do **not** include the fence lines themselves; pasting them would render your whole PR body as a code block). Then fill in answers directly under each label:

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
Make sure to read our AI policy (https://github.com/webpack/governance/blob/main/AI_POLICY.md) or your Pull Request may be closed due to irresponsible use of AI. -->
```

Required answer per section:

- **Summary** — motivation and what problem is solved; link the related issue (`Closes #…` / `Fixes #…`).
- **What kind of change does this PR introduce?** — one of: fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs.
- **Did you add tests for your changes?** — yes/no + which test files.
- **Does this PR introduce a breaking change?** — yes/no + migration path if yes.
- **If relevant, what needs to be documented…** — list doc updates or write `n/a`.
- **Use of AI** — required. State that Claude Code was used and how (e.g. "Claude Code drafted the implementation under human review"). Per the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md), omitting or misrepresenting this can get the PR closed.
