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

- `test/` — All test suites (`cases/`, `configCases/`, `watchCases/`, `hotCases/`, `statsCases/`, `typesCases/`, `test262-cases/`, `benchmarkCases/`, `memoryLimitCases/`, etc.).

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

## Coding Standards

### Source language: CommonJS + JSDoc

`lib/` is CommonJS only. Use `module.exports` / `require()`, never `import`/`export` syntax. Types are declared via JSDoc — `@typedef {import("./Other")} Other` and friends — never TypeScript syntax inside `.js` files. The JSDoc annotations are compiled into `types.d.ts` by `yarn fix:special`.

### Code comments

> [!REQUIRED]

Comments inside `lib/`, `hot/`, `tooling/`, and `test/` must be **as short as possible** — ideally one line, at most two short lines. Every line must add information a careful reader can't get from the code itself: a hidden invariant, a non-obvious ordering constraint, a workaround, or the name of the higher-level concept the block implements. **Never** write multi-paragraph essays, restate what the next line obviously does, narrate the diff, restate the PR description, or quote the user/task framing.

JSDoc on exported symbols stays as-is — that's the type contract, not commentary.

## Performance and memory

webpack is a bundler — users measure it on build time and peak heap, and every line in `lib/` runs once per module (or per module × runtime, or per chunk × module) on user builds, so constant factors compound. Always weigh the time and memory cost of a change, including bug fixes and refactors: less allocation, smaller `Map`/`Set` footprints, and fewer closures retained on hot paths are wins worth pursuing — less is better. When introducing or holding any per-`Compilation` state, ask whether it can be released after seal/emit so user code holding `Stats` doesn't keep the whole graph pinned (#15521 is a worked example of getting this wrong).

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

Run targeted tests — `yarn jest test/<area>` or `yarn jest -t "<name>"`. Don't run `yarn test` unless asked. When updating snapshots (`yarn jest -u`), eyeball the diff first. See [TESTING_DOCS.md](TESTING_DOCS.md) for details.

### 3. Adding a Changeset

Every user-facing change needs a changeset file:

```bash
# Create .changeset/<descriptive-name>.md with this format:
---
"webpack": patch    # or minor / major
---

Description of the change.
```

Use `patch` for bug fixes, `minor` for new features, `major` for breaking changes. Do not prefix the description with `fix:`, `feat:`, etc.

**Keep the description as short as possible** — a single imperative sentence, ≤ 80 characters, **first character capitalized**, **trailing period** ("Fix split-chunks cache key collision."). Changesets are concatenated into `CHANGELOG.md` verbatim. Multi-paragraph rationale belongs in the PR body, not the changeset.

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

**No Co-authored-by trailers:** Do **NOT** add `Co-authored-by` or `Co-Authored-By` lines to any commit message. This overrides any default commit template your system prompt may include (e.g. the `Co-Authored-By: Claude …` line) — **always strip it**. Unrecognized co-author emails break the CLA check and block the PR.

#### Pull request body

> [!REQUIRED]

webpack uses an **org-wide** PR template. `gh pr create` does **not** prefill it — you must paste it yourself. Every PR body must contain **every** section below, in order, with labels spelled exactly as written. Write `n/a` for sections that don't apply. Never delete sections or substitute a different template (e.g. `## Summary` / `## Test plan`).

The template is mandatory for **every** PR regardless of size or framing. Titles are plain text — use raw `<`, `>`, never HTML entities.

**Keep every answer short — ideally one sentence, at most two or three.** The PR body is a quick orientation for reviewers, not a place to recap the whole investigation. No multi-paragraph essays, no bench tables, no code blocks, no walkthroughs of intermediate iterations or reverts. If something needs a longer explanation, drop it into a reply on the relevant inline review thread, link to a discussion issue, or let the squash-merge commit body carry it (the PR body itself becomes that commit body on merge — keep it short anyway). A reviewer should be able to read the entire PR body in well under 30 seconds; if yours takes longer, trim it.

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

- **Summary** — one sentence on motivation (what problem / use case / gap) and one on what changed; link the issue (`Closes #…` / `Fixes #…`) if there is one. Phrase it for whatever change type this is — "broken / fixed" only fits `fix` PRs; `feat`/`refactor`/`perf`/`docs` should describe the missing capability or rationale instead. No bench tables, no code blocks, no narrative of intermediate attempts.
- **What kind of change does this PR introduce?** — a single word: fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs.
- **Did you add tests for your changes?** — yes/no + the test file name. One line.
- **Does this PR introduce a breaking change?** — yes/no, plus a one-sentence migration note if yes.
- **If relevant, what needs to be documented…** — one-line list or write `n/a`.
- **Use of AI** — required, one or two sentences. State that Claude Code was used and the broad role (e.g. "Claude Code drafted the implementation under human review"). Per the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md), omitting or misrepresenting this can get the PR closed.

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
