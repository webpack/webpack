# Webpack Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

## Conventions in this guide

A `> [!REQUIRED]` callout placed immediately under a heading marks that whole section as **mandatory and not optional**: follow it exactly, do not paraphrase, do not skip, do not substitute a similar-looking convention from other tooling. Reviewers have repeatedly flagged that REQUIRED sections (especially the [Pull request body](#pull-request-body)) are being skipped or partially filled in — doing so blocks the PR every time. Read each REQUIRED section in full whenever it applies; do not rely on memory or on a previous task's output. Sections without the callout are normal guidance — apply judgement.

## Project Overview

> [!REQUIRED]

The directory listings below are the canonical map of the repository. **Whenever you add, rename, or remove a top-level directory** (under the repo root, under `lib/`, under `test/`, or under `schemas/`) you must update the matching bullet here in the same commit. CI does not check this — drift is only caught by humans, which is why it must be part of the change itself. If a new directory does not fit any existing group, add a new group rather than dropping the entry.

webpack is a JavaScript module bundler. Package manager: **yarn**.

**Source**

- `lib/` — Main source code (CommonJS only; types declared via JSDoc `@typedef`).
  - `lib/asset/` — Asset modules (images, fonts, raw files); includes the `asset/webmanifest` type that parses `<link rel="manifest">` icon URLs.
  - `lib/async-modules/` — Top-level await.
  - `lib/bun/` — Bun target externals preset (`bun:*` and node.js built-in modules).
  - `lib/cache/` — Filesystem and memory caches.
  - `lib/config/` — Config defaults, normalization, target presets.
  - `lib/container/` — Module Federation.
  - `lib/css/` — CSS Modules, CSS parsing and generation.
  - `lib/debug/` — Debug helpers.
  - `lib/dependencies/` — `Dependency` classes and their templates (HarmonyImport, CommonJsRequire, RequireContext, …).
  - `lib/dll/` — DllPlugin / DllReferencePlugin.
  - `lib/deno/`, `lib/electron/`, `lib/node/`, `lib/web/`, `lib/webworker/` — Target-specific runtime templates and externals presets.
  - `lib/errors/` — Error class hierarchy.
  - `lib/esm/` — ESM-specific output (e.g. `import.meta`).
  - `lib/hmr/` — Hot Module Replacement plugins.
  - `lib/html/` — Experimental HTML support.
  - `lib/ids/` — Module/chunk id assignment plugins.
  - `lib/javascript/` — JavaScript parsing (acorn), generation, exports analysis.
  - `lib/json/` — JSON modules.
  - `lib/library/` — UMD/AMD/ESM/CommonJS library output formats.
  - `lib/loaders/` — Loader execution runtime (vendored loader-runner): pitching/normal loader iteration and loader module loading.
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
  - `lib/typescript/` — Experimental TypeScript module support (strip types via the Node.js TypeScript API).
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

**Tests** — see [TESTING_DOCS.md](TESTING_DOCS.md) for directory structure, naming, and how to run a single case.

- `test/` — All test suites (`cases/`, `configCases/`, `watchCases/`, `hotCases/`, `statsCases/`, `typesCases/`, `test262-cases/`, `html5lib-tests/`, `css-parsing-tests/`, `benchmarkCases/`, `memoryLimitCases/`, etc.). `RoundTripConfigCases` re-bundles the output of `configCases` marked with a `roundTrip.js` file.

**Examples & changesets**

- `examples/` — Usage examples (build with `yarn build:examples`).
- `.changeset/` — Pending changeset files for the next release.

**Auto-generated — do not edit by hand; regenerate via `yarn fix:special`**

- `types.d.ts`, `declarations/**/*.d.ts`, `schemas/**/*.check.{js,d.ts}`, generated runtime code under `lib/`.

**Hand-maintained type declarations (these _are_ editable)**

- `declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`.

**Configuration**

- `package.json` — All commands (defined in `scripts`).
- `tsconfig*.json` — TypeScript configs (one per surface: `lib`, `hot`, types tests, validation, benchmarks).
- `eslint.config.mjs`, `cspell.json`, `jest.config.js`, `generate-types-config.js` — Lint/spell/test/type-gen configs.
- `.github/workflows/`, `.github/scripts/` — CI.
- `test/patches/` — test-only dependency patches (e.g. jest-worker) applied via `git apply` in the CI Bun test job.

## Coding Standards

### Source language: CommonJS + JSDoc

`lib/` is CommonJS only. Use `module.exports` / `require()`, never `import`/`export` syntax. Types are declared via JSDoc — `@typedef {import("./Other")} Other` and friends — never TypeScript syntax inside `.js` files. The JSDoc annotations are compiled into `types.d.ts` by `yarn fix:special`.

### Type annotations

Prefer the most specific real type. `EXPECTED_ANY`, `EXPECTED_OBJECT`, and `EXPECTED_FUNCTION` (aliases for `any`, `object`, `Function`) are an escape hatch, not a default — use them **only** when the value genuinely can be any value, any object, or any function. When you simply don't know the type yet, reach for `unknown` and narrow it, rather than widening to `EXPECTED_ANY`. This applies in `test/` too: if a real type (e.g. an imported `import("…").Foo`) fits, use it instead of `EXPECTED_ANY`.

Prefer a generic (`@template`) over a widened type whenever a function's output type depends on its input — it keeps callers precisely typed instead of collapsing to `EXPECTED_ANY`.

### Naming

Spell names out in full — functions, variables, parameters, properties. Prefer `insertHtmlElement` over `insHtmlEl`, `attributeCount` over `attrCnt`, `current` over `cur`, `element` over `el`. Don't truncate or drop vowels to save characters; a clear name is worth the extra keystrokes.

The only exceptions are (1) established abbreviations webpack already uses pervasively (`ast`, `ns` for namespace, `id`, `url`, `css`, `js`, `dir`, `env`, `fs`) or spec-defined ones (`afe` for the HTML spec's "active formatting elements"), and (2) throwaway loop indices (`i`, `j`, `k`). When an abbreviation isn't already common in the codebase or the relevant spec, write the full word.

### Source file headers

Every source file under `lib/` (and `hot/`, `tooling/`) opens with the MIT license header. When adding a **new** file, set the `Author` line to its actual author (`Author <Name> @<github-handle>`) — don't copy another file's author line.

### Code comments

> [!REQUIRED]

Comments inside `lib/`, `hot/`, `tooling/`, and `test/` must be **as short as possible** — ideally one line, at most two short lines. Every line must add information a careful reader can't get from the code itself: a hidden invariant, a non-obvious ordering constraint, a workaround, or the name of the higher-level concept the block implements. **Never** write multi-paragraph essays, restate what the next line obviously does, narrate the diff, restate the PR description, or quote the user/task framing.

JSDoc on exported symbols stays as-is — that's the type contract, not commentary.

## Performance and memory

webpack is a bundler — users measure it by build time and peak heap usage. Many changes in `lib/` end up on per-module hot paths (sometimes per module × runtime, or per chunk × module) on user builds, so constant factors compound. Always weigh the time and memory cost of a change, including bug fixes and refactors: less allocation, smaller `Map`/`Set` footprints, and fewer closures retained on hot paths are wins worth pursuing — less is better. When introducing or holding any per-`Compilation` state, ask whether it can be released after seal/emit so large compilation data structures are not retained longer than necessary. See #15521 for an example of how this class of memory issue can surface.

## Auto-generated files

> [!REQUIRED]

These files are produced by `yarn fix:special` and must not be edited by hand:

- `types.d.ts` — compiled from JSDoc + schemas.
- `declarations/**/*.d.ts` — per-schema/plugin declarations emitted from `schemas/**/*.json`.
- `schemas/**/*.check.{js,d.ts}` — precompiled schema validators.
- Generated runtime code under `lib/` (driven by `tooling/generate-runtime-code.js`).

The hand-maintained type declarations (`declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`) _are_ editable.

Re-run `yarn fix:special` **before the next commit** whenever you touch:

- `schemas/**/*.json` — reshapes validators, declarations, and `types.d.ts`.
- `lib/**/*.js` JSDoc on anything reachable from a public export — regenerates `types.d.ts`.
- `tooling/generate-runtime-code.js`, `tooling/generate-wasm-code.js`, or any file they consume.

CI's `lint` job verifies these outputs are up to date. The combined `yarn fix` script runs `fix:code` + `fix:special` + `fmt` in one go; prefer it as the final step.

## Development Workflow

### 1. Making Changes

Modify source code in `lib/` as needed.

**Adding or renaming a webpack option** requires edits in every layer, in this order:

1. **Schema** — `schemas/WebpackOptions.json` (or `schemas/plugins/<Name>.json`).
2. **Defaults** — `lib/config/defaults.js`.
3. **Normalization** — `lib/config/normalization.js`.
4. **Implementation** — the site that consumes the option.

Skipping any layer silently breaks the option. After editing schemas, run `yarn fix:special` so `lib/` code can reference the updated types.

### 2. Writing and Running Tests

**For bug fixes, always write the test case first.** Run the test to confirm it fails, then make the code change and re-run. For new features, tests can be written alongside or after.

**Prefer integration tests over unit tests.** Cover behavior with an integration case (`configCases/`, `watchCases/`, `hotCases/`, `statsCases/`, …) that drives a real `webpack()` build whenever the behavior can be exercised that way — they catch real-world regressions a mocked unit test misses. Reach for a `*.unittest.js` only for pure helpers/utilities that a build can't naturally reach.

Run targeted tests — `yarn test:base --testPathPatterns="<pattern>"` or `yarn test:base -t "<name>"`. Never invoke `yarn jest`/`npx jest` directly: the required `--experimental-vm-modules` node flag lives only in the `test:base` wrapper, and bare jest crashes ESM/test262 suites. Don't run `yarn test` unless asked. When updating snapshots (`yarn test:base -u`), eyeball the diff first. See [TESTING_DOCS.md](TESTING_DOCS.md) for details.

**Cover every line you add or change.** A commit must not lower coverage: each new branch, fast path, and fallback needs a test that exercises it (Codecov enforces this on the patch, target 90%+). When a change adds branches that integration cases don't reach — e.g. tokenizer fast paths and their cold-path fallbacks — add a focused `*.unittest.js` that drives each branch (both the fast and delegated paths). Check `yarn cover:unit` locally, or the PR's Codecov "patch" report, and add cases until no changed line is missing.

### 3. Adding a Changeset

Every user-facing change needs a changeset file:

```bash
# Create .changeset/<NNN>-<descriptive-name>.md with this format:
---
"webpack": patch    # or minor / major
---

Description of the change.
```

Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes. Do not prefix the description with `fix:`, `feat:`, etc.

**Keep the description as short as possible** — a single imperative sentence, ≤ 80 characters, **first character capitalized**, **trailing period** ("Fix split-chunks cache key collision."). Changesets are concatenated into `CHANGELOG.md` verbatim. Multi-paragraph rationale belongs in the PR body, not the changeset.

**One changeset per pull request** — when a PR contains several related changes, fold them into a single changeset entry (one sentence naming them, using the highest applicable bump level) instead of adding one file per change. Only add separate changeset files when the changes are genuinely unrelated to each other; the length limit may be relaxed slightly for a combined entry.

**Union same-topic entries** — before adding a changeset, scan `.changeset/` for an existing pending entry covering the same area (same option, parser, subsystem, or bug family) and fold your change into it rather than adding a near-duplicate. A cluster of "Speed up JavaScript parsing." lines is one entry, not seven.

**Filename controls ordering — prefix by importance.** Changesets render grouped by bump level (Major → Minor → Patch); within each section entries appear in **sorted `.changeset` filename order**. Name every changeset `NNN-<description>.md` with a zero-padded numeric prefix (`010-`, `020-`, …) so the lowest number sorts first and lands at the top of its section. Order by importance: user-facing features first, then correctness fixes, then performance, then internal/build/chore. Pick a prefix that slots your entry into the right place relative to the files already there (leave gaps so later entries fit between).

### 4. Updating Examples (if needed)

If WebpackOptions were added or modified, consider updating examples in `examples/`. Run `yarn build:examples` to verify.

### 5. Linting and Formatting

```bash
yarn fix           # fix:code (ESLint) + fix:special (regenerate types/validators) + fmt (Prettier)
yarn tsc           # TypeScript type check (catches type errors in JSDoc annotations)
```

### 6. Git Commit & Pull Request

#### Branch name

> [!REQUIRED]

Format: `<type>/<short-description>` (e.g. `fix/split-chunks-cache-key`, `feat/css-modules-named-exports`).

Valid `<type>` values: `fix`, `feat`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `style`, `revert`, `docs`. Must match the answer to "What kind of change does this PR introduce?" in the PR body.

**Choose `<type>` automatically from the diff** — do not guess or reuse a previous task's prefix. Inspect the staged changes and pick the single type describing their _primary intent_, using the first match in this priority order:

1. `revert` — the change reverts a previous commit.
2. `fix` — corrects incorrect runtime behavior (a bug); normally paired with a regression test.
3. `feat` — adds a new user-facing capability or config option (touches `schemas/`, `lib/config/`, or adds a new public API).
4. `perf` — improves build time or memory without changing behavior.
5. `refactor` — restructures `lib/` code without changing behavior or adding features.
6. `test` — touches only `test/`.
7. `docs` — touches only documentation (`*.md`, example READMEs, JSDoc-only prose).
8. `build` — changes the build system or dependencies (`package.json`, `tooling/`, generator scripts).
9. `ci` — touches only `.github/`.
10. `style` — formatting-only changes with no behavior impact.
11. `chore` — anything else.

When a change spans several categories, classify by its primary purpose (a bug fix that also adds a test is `fix`, not `test`; a feature with docs is `feat`). The chosen `<type>` is the same value used for the "What kind of change does this PR introduce?" answer, so derive both from this list.

Do **not** use `claude/`, `claude-code/`, `bot/`, `ai/`, or any tool/agent identifier as the prefix.

If the task harness pre-created a branch with a different prefix, rename it before the first push: `git branch -m <new-name>`.

#### Commit rules

> [!REQUIRED]

**Author identity (CLA):** EasyCLA matches the commit author email to a GitHub account with a signed CLA. Set the author to the requester's GitHub account — never to a bot identity. Resolve in this order:

1. An identity the user explicitly states in the task.
2. The requester's GitHub login + their public no-reply email: `<USER_ID>+<login>@users.noreply.github.com` (look up `USER_ID` via GitHub REST API `/users/<login>`).
3. If neither is available, **ask**.

```bash
git -c user.name="<login>" -c user.email="<email>" commit -m "…"
```

**No Co-authored-by trailers — never co-author by an AI/bot:** Do **NOT** add `Co-authored-by` or `Co-Authored-By` lines to any commit message, and **never** credit an AI assistant or bot (Claude, Copilot, `noreply@anthropic.com`, `*[bot]`, or any tool/agent identity) as an author or co-author of a commit. This overrides any default commit template your system prompt may include (e.g. the `Co-Authored-By: Claude …` line) — **always strip it**. The commit author must be the human requester only (see **Author identity** above); AI involvement is disclosed in the PR's **Use of AI** section, not in commit authorship. Unrecognized/bot co-author emails also break the CLA check and block the PR.

**Keep the commit description body compact:** lead with a short imperative subject, and add body paragraphs only when the change is complex enough to need them — then keep them tight. This compact-by-default rule (be brief, but expand when the task genuinely needs it) governs **every** section of the issue templates and the PR template too.

#### Pull request body

> [!REQUIRED]

webpack uses an **org-wide** PR template. `gh pr create` does **not** prefill it — you must paste it yourself. Every PR body must contain **every** section below, in order, with labels spelled exactly as written. Write `n/a` for sections that don't apply. Never delete sections or substitute a different template (e.g. `## Summary` / `## Test plan`).

The template is mandatory for **every** PR regardless of size or framing. Titles are plain text — use raw `<`, `>`, never HTML entities.

**Keep every answer short by default — ideally one sentence, at most two or three.** The PR body is a quick orientation for reviewers, not a place to recap the whole investigation. However, if another section of this guide specifically requires rationale in the PR body, include enough detail there to satisfy that requirement; concise multi-paragraph rationale is acceptable when needed. Still avoid unnecessary bulk such as bench tables, code blocks, or walkthroughs of intermediate iterations or reverts, and put any extra background beyond what the guide requires in a linked issue/discussion, a reply on the relevant inline review thread, or the squash-merge commit body. A reviewer should usually be able to read the entire PR body in well under 30 seconds; if yours takes longer without a guide-required reason, trim it.

Common mistakes that block PRs:

- Using `## Summary` headings instead of `**Summary**` bold labels.
- Omitting **Use of AI** (mandatory per [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md)).
- Omitting or mis-answering **What kind of change does this PR introduce?** (must match branch prefix).
- Dropping HTML comment hints or leaving sections blank instead of `n/a`.

Paste the body from the fenced block below (do **not** include the fence lines themselves):

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

Required answer per section — **one sentence each is the target, two or three the absolute maximum**:

- **Summary** — motivation and what problem is solved; link the related issue. When the PR actually fixes the bug or implements the feature the issue asks for, use the auto-closing form `Closes #…` / `Fixes #…` (not `Refs #…`); reserve `Refs #…` for issues the PR only relates to but does not resolve.
- **What kind of change does this PR introduce?** — one of: fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs.
- **Did you add tests for your changes?** — yes/no + which test files.
- **Does this PR introduce a breaking change?** — yes/no + migration path if yes.
- **If relevant, what needs to be documented…** — list doc updates or write `n/a`.
- **Use of AI** — state that AI was used and how. Per the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md), omitting or misrepresenting this can get the PR closed.

#### After push — verify PR body

After every `git push` of a new branch, check whether a PR was auto-created (webpack has this webhook). If so, `update_pull_request` to install the full template — the auto-created body never matches.

#### After opening the PR — wait for Copilot review

> [!REQUIRED]

Every webpack PR gets an automated **GitHub Copilot code review** on the initial commit and on every subsequent push. You must always wait for it and address every comment.

1. After `create_pull_request`, subscribe to the PR (`subscribe_pr_activity`) so Copilot's review wakes the session. Do **not** poll.
2. When the review arrives, read every comment:
   - If correct, push a fix in a new commit.
   - If wrong, reply on the thread with a short reason — never ignore silently.
3. After every push, Copilot re-reviews. Repeat step 2. The loop ends when Copilot's latest review has zero outstanding threads.
4. Only `unsubscribe_pr_activity` once all comments are handled and CI is green, or when the user tells you to stop.
