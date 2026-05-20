# Webpack Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

## Conventions in this guide

A `> [!REQUIRED]` callout placed immediately under a heading marks that whole section as **mandatory**: follow it exactly, do not paraphrase, do not skip, do not substitute a similar-looking convention from other tooling. Sections without the callout are normal guidance — apply judgement.

## Project Overview

> [!REQUIRED]

The directory listings below are the canonical map of the repository. **Whenever you add, rename, or remove a top-level directory** (under the repo root, under `lib/`, under `test/`, or under `schemas/`) you must update the matching bullet here in the same commit. CI does not check this — drift is only caught by humans, which is why it must be part of the change itself. If a new directory does not fit any existing group, add a new group rather than dropping the entry.

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

> [!REQUIRED]

These files are produced by `yarn fix:special` and must not be edited by hand:

- `types.d.ts` — compiled from JSDoc + schemas.
- `schemas/**/*.check.{js,d.ts}` — precompiled schema validators.
- Generated runtime code under `lib/` (driven by `tooling/generate-runtime-code.js`).

The hand-maintained type declarations (`declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`) _are_ editable.

Whenever you touch any of the following, re-run `yarn fix:special` **before the next commit** — never edit the generated outputs by hand and never commit a source change without the matching regeneration. CI's `lint` job verifies the outputs are up to date and will fail the PR otherwise:

- `schemas/**/*.json` — every JSON schema change reshapes `WebpackOptions.check.js`, the per-plugin `*.check.js` validators, `declarations/**/*.d.ts`, and `types.d.ts`.
- `lib/**/*.js` JSDoc on anything reachable from a public export — `types.d.ts` is regenerated from it.
- `tooling/generate-runtime-code.js`, `tooling/generate-wasm-code.js`, or any file they consume — they emit generated code under `lib/`.

The combined `yarn fix` script runs `fix:code` + `fix:special` + `fmt` in one go; prefer it as the final step before any commit that touched the paths above.

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

Run linting, formatting, and type checking as the final step. Prefer the combined script — it covers everything CI verifies (including the auto-generated outputs):

```bash
yarn fix           # fix:code (ESLint) + fix:special (regenerate types/validators) + fmt (Prettier)
yarn tsc           # TypeScript type check (catches type errors in JSDoc annotations)
```

If you only ran `yarn fix:code` / `yarn fmt`, double-check that you didn't touch any path listed under [Auto-generated files](#auto-generated-files); if you did, `yarn fix:special` is mandatory or CI's `lint` job will fail.

### 6. Git Commit & Pull Request

#### Branch name

> [!REQUIRED]

Branch names must start with the **PR change-type prefix** from the [Pull request body](#pull-request-body) template (the answer to "What kind of change does this PR introduce?"), followed by `/` and a short kebab-case description:

```
<type>/<short-description>
```

Valid `<type>` values are exactly the ones listed in the PR template — `fix`, `feat`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `style`, `revert`, `docs`. Pick the same one you will write under "What kind of change does this PR introduce?" in the PR body so the branch, the PR answer, and the eventual squash commit all agree.

Do **not** use `claude/`, `claude-code/`, `bot/`, `ai/`, or any other tool / agent identifier as the prefix — those names are not in the allowed list and will be rejected in review. The branch should describe the change, not the author.

Examples:

- `fix/split-chunks-cache-key`
- `feat/css-modules-named-exports`
- `docs/improve-agents-md`
- `refactor/normal-module-factory-hooks`

If the task harness pre-created a branch with a different prefix (e.g. a random suffix or a tool name), rename it before the first push:

```bash
git branch -m <new-branch-name>
```

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

**This is not optional and not a suggestion.** Reviewers have repeatedly flagged that the PR template is being skipped, swapped for a generic "Summary / Test plan" layout, or partially filled in. Doing so blocks the PR. Read this section in full every time you open or update a PR — do not rely on memory or on a previous task's body.

webpack uses an **org-wide** PR template from [`webpack/.github`](https://github.com/webpack/.github/blob/main/.github/pull_request_template.md). The GitHub web UI prefills it; the GitHub API / MCP / `gh pr create` path does **not**, so you must paste the template yourself when opening a PR programmatically. Every PR body must contain **every** section below, in this order, with the labels spelled exactly as written. If a section truly does not apply, write `n/a` under it. Do not delete sections, do not reorder, do not strip the HTML comment hints, and do not substitute a different template (e.g. `## Summary` / `## Test plan`).

Common ways agents get this wrong — all of them are PR-blocking:

- Writing `## Summary` and `## Test plan` headings instead of the bold-labelled sections below (`**Summary**`, `**What kind of change does this PR introduce?**`, …).
- Omitting **Use of AI** — this is mandatory under the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md); a missing or vague answer can get the PR closed.
- Omitting **What kind of change does this PR introduce?** or answering with something outside the allowed list (`fix`, `feat`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `style`, `revert`, `docs`). The answer here must also match the branch-name prefix (see [Branch name](#branch-name)).
- Dropping the HTML comment hints that sit under each label. Keep them — they are part of the template.
- Leaving a section blank instead of writing `n/a`.

Before every `create_pull_request` and every `update_pull_request` call, diff the body you are about to send against the template below. If any section is missing, add it before sending.

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

#### After opening the PR — wait for Copilot review

> [!REQUIRED]

Opening the PR is not the end of the task. Every webpack PR gets an automated **GitHub Copilot code review**, and you must **always** wait for it, then address every comment it leaves — no exceptions, even on docs-only or one-line changes. Skipping this step leaves reviewers to triage Copilot's findings manually and is a frequent cause of PRs stalling.

Workflow:

1. After `create_pull_request` succeeds, subscribe to the PR (`subscribe_pr_activity`) so Copilot's review wakes the session as a `<github-webhook-activity>` event. Do **not** poll with `sleep` or repeated status checks.
2. When the Copilot review arrives, read every comment. For each one:
   - If the suggestion is correct, push a fix in a new commit on the same branch (use the same CLA-compliant author identity as the original commits).
   - If the suggestion is wrong or doesn't apply, reply on the thread (`add_reply_to_pull_request_comment`) with a short, specific reason — never ignore a comment silently.
3. After pushing fixes, wait for Copilot to re-review and repeat until every thread is either resolved by a fix or answered with a reasoned reply.
4. Only `unsubscribe_pr_activity` once every Copilot comment has been handled and CI is green, or when the user explicitly tells you to stop.

Treat Copilot's comments the same way you would treat a human reviewer's — answering "always" means every comment on every PR, not just the ones that look important.
