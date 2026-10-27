# Webpack Development Guide

## Conventions in this guide

A `> [!REQUIRED]` callout directly under a heading makes that whole section **mandatory**: follow it exactly — do not paraphrase, skip, or substitute a similar-looking convention from other tooling. Reviewers keep flagging skipped or partly filled REQUIRED sections (especially the [Pull request body](docs/pull-requests.md#pull-request-body)), and every such skip blocks the PR — so re-read each one in full whenever it applies instead of relying on memory or a previous task's output. Sections without the callout are guidance — apply judgement.

**Editing this guide.** Keep every change short and simple. Every session loads this file whole, so each line costs every task:

- **Size budget: 40,000 characters**, where Claude Code starts warning about a large instruction file. `yarn lint:agents` (part of `yarn lint`) enforces it; over budget, move a task-specific section to `docs/<topic>.md`, leaving its heading, its `[!REQUIRED]` callout, one line per rule it enforces and a link.
- **What stays here**: rules every task needs — "never" prohibitions, conventions touching every edit, gotchas that look safe but aren't. **What moves**: workflows for one kind of task, reference material, explanations of a tool, maps.
- **Never drop a rule, fact, number or reason to shorten** — move it verbatim, or reword or merge.
- **One fact, one place**: link instead of restating, and don't copy what the repo already says (a directory listing, the `package.json` scripts, a signature).
- **Docs live in `docs/`**, never `lib/` (it is published); renaming a heading breaks its `#anchor` links, so grep for them.

## Working style

Five habits that counter the usual coding-agent failures (assuming silently, overbuilding, editing what it doesn't understand, padding every answer). They bias toward caution over speed, so use judgement on a one-line fix:

- **Think before coding.** State your assumptions up front. When a request has several readings that lead to different work, present them rather than picking silently; when the difference is minor, state the assumption, go on and flag it in the report. Say so when a simpler approach exists, and push back when warranted. When something is unclear enough that any reading could waste the work, stop, name what is confusing and ask.
- **Simplicity first.** Write the minimum that solves the ask: no feature beyond it, no abstraction for single-use code, no "flexibility" or configurability nobody asked for, no error handling for impossible scenarios. If you write 200 lines and it could be 50, rewrite. Would a senior engineer call it overcomplicated? Then simplify. Performance outranks size: on a hot path, longer code that measurably saves CPU or memory beats shorter code ([Performance and memory](#performance-and-memory)). Still, measure the win and weigh it against the code it costs; a marginal gain doesn't justify a large body of code.
- **Surgical changes.** Every changed line traces directly to the request. Don't "improve" adjacent code, comments or formatting; don't refactor what isn't broken; match the existing style even where you'd do it differently. Remove the imports, variables and functions your own change made unused. Remove other dead code only when nothing uses it (no class, function, method or test) and it isn't public API (not exported or re-exported, not in `types.d.ts`, not reachable through `package.json` `exports`, not a deep import `yarn find-deep-imports:check` reports); if you can't tell whether it is used or what it is for, ask.
- **Goal-driven execution.** Turn the task into a verifiable goal before starting: "add validation" is "write tests for invalid inputs, then make them pass"; "fix the bug" is "write a test that reproduces it, then make it pass" ([Testing](#testing)); "refactor X" is "tests pass before and after". For multi-step work, state a short plan with a check per step (`1. [step] → verify: [check]`). Strong success criteria let you loop on your own; "make it work" needs constant clarification.
- **Answer plainly.** Use the fewest words that keep the context, meaning and point: no preamble, filler or restating what the reader can see. Lead with what could not be verified; say when a test failed or a step was skipped, and never round partial work up to done. Spell out an abbreviation in parentheses the first time it appears, so nobody has to look it up. Cite code as `path:line`, one per sentence, and put the rest in words. Show rather than describe: a code block with before and after for anything changed (the PR body's Summary [asks for the same](docs/pull-requests.md#pull-request-body)), a table or code block for what moved, what a run printed or where a regression sits.

These habits are working when diffs carry only requested changes, code is simple the first time, and clarifying questions come before implementation rather than after mistakes.

**A regression with a known cause in history is reverted first.** When `git log` shows the commit that introduced it, undo that part, push, and let CI report what moved (corpus tables, snapshots, sizes); measure or improve only afterwards, in follow-up commits.

**Recommend a fresh session when it pays.** Every call re-reads the whole session, so a call at 500k tokens of context costs several times one in a fresh session. When a task is done and the next one needs little of this context, suggest starting a new session with a short handoff brief; it is only a recommendation, and staying is right when the context saves explaining everything again. Hand read-heavy investigation (transcripts, large logs, wide searches) to a subagent, so the reading stays out of this context. A run longer than about ten minutes goes in the background once, with its output in a file and no progress polls. Never read a generated or very large file whole (type declarations, generated tables, snapshots): search for the symbol, then read that range.

## Commands

Use **yarn**, not npm. A fresh checkout has no `node_modules`: if a script fails on a missing module, run `yarn --frozen-lockfile` first, the same command CI uses. Every command is a `package.json` script; these are the ones whose use isn't obvious from the name:

- `yarn fix` — `fix:code` (ESLint) + `fix:special` + `fmt` (Prettier). Prefer as the final step.
- `yarn fix:special` — Regenerate `types.d.ts`, declarations, schema validators and generated runtime code.
- `yarn lint` — What CI runs: ESLint + the `AGENTS.md` size budget + unique `lib/` class names + generated-output checks + every `tsc` project + Prettier + spellcheck.
- `yarn test:base --testPathPatterns="<pattern>"` / `-t "<name>"` — Targeted tests; `-u` updates snapshots (eyeball the diff first).
- `yarn test` — Full suite — only when asked.

Every other script, with what it does: [TESTING_DOCS.md](TESTING_DOCS.md#more-scripts).

Never run `yarn jest`/`npx jest`: the required `--experimental-vm-modules` flag lives only in `test:base`, and bare jest crashes the ESM/test262 suites. Running a single case: [TESTING_DOCS.md](TESTING_DOCS.md).

**CI must come back fully green** ([details](docs/pull-requests.md#after-opening-the-pr--every-check-ends-green)); read the job list from `.github/workflows/`, not memory. Two jobs are unusual — watch both when touching hot paths or large fixtures: the benchmark's memory mode is sensitive to fixture size and to which cases share its process, and the Bun job runs under `--smol` and surfaces OOMs Node doesn't. Every job costing more than a few minutes waits on `lint`, `basic` and `unit` (needed for merge anyway), so while one of them is red most of the run reports `skipped`. That includes the benchmarks: on a PR `test.yml` calls `benchmarks.yml` behind those three (reported as `benchmarks / benchmark (1/6)`); on `main` nothing gates them (plain `benchmark (1/6)`) so CodSpeed always has a baseline.

## Architecture

> [!REQUIRED]

The canonical repository map is [docs/architecture.md](docs/architecture.md) — read it before placing or moving a file; to find one, search (`rg`, glob) rather than reading the map. **When you add, rename or remove a top-level directory** (under the repo root, `lib/`, `test/` or `schemas/`), update its bullet there in the same commit — CI doesn't check it, only humans catch drift. If a directory fits no group, add a group rather than dropping the entry.

Rules the map carries that apply everywhere:

- **A plugin never belongs in `lib/` root**: it goes in the directory for what it acts on (asset set → `lib/output/`, module graph → `lib/optimize/`, entry → `lib/entry/`); if none fits, add a directory, with its bullet in the map, in the same commit.
- **Documentation lives in `docs/`**, never under `lib/`, which is published (`package.json` `files`); docs about `test/` or `tooling/` may sit in those directories.
- **Edit an option's declaration, never its schema**: JSDoc typedefs in `lib/` for a plugin, `declarations/WebpackOptions.ts` for the configuration; `generate-schemas.js` derives `schemas/**`.
- **Git submodules** live under `test/external/`, fetched on demand and always `--depth 1` (`wpt` alone is ~161k files); each is described in [TESTING_DOCS.md](TESTING_DOCS.md#external-test-corpora).

**Adding or renaming a webpack option** touches every layer in order — type, defaults, normalization, implementation, generated output and five snapshot files no `configCases/` pattern matches — and skipping one silently breaks the option: read [docs/options.md](docs/options.md) first, which also covers the `@since`/`@experimental` JSDoc keywords and what `webpack/valid-schema` rejects.

> [!REQUIRED] > **Never hand-edit what `yarn fix:special` generates**, even when it also reformats files you didn't touch. That churn means your toolchain resolved differently from CI's: commit only your own hunks, then **verify them against the generator** (re-run and diff) — never hand-write what you think it would emit. A hand-written JSDoc block missing the `@since` line the schema's `added` keyword produces, or a `types.d.ts` member the JSDoc implies, fails `lint` with only `… need to be updated`.

**A nested minifier gets the outer one's options.** When one language is minified inside another (CSS or SVG inside HTML, SVG inside CSS), pass the inner minifier every outer option it supports that affects its output, or the same code minifies differently inline and on its own.

**Adding a dependency type or runtime requirement** needs three pieces wired together (a `makeSerializable` registration among them): read [docs/architecture.md](docs/architecture.md#adding-a-dependency-type-or-runtime-requirement) first.

### Moving a file out of `lib/` root

> [!REQUIRED]

**Read [docs/architecture.md](docs/architecture.md#moving-a-file-out-of-lib-root) before moving any file under `lib/`**, out of its root or between directories. The rules it enforces:

- Run `yarn find-deep-imports:check` on every move, before committing; a path a webpack 5 package imports unconditionally owes a `// TODO in the next major release: remove` re-export at its old path.
- Rewrite all six places a path hides (`require`, JSDoc `@import`, `@typedef {import()}`, schema `tsType`, `makeSerializable` requests with the old ones kept after the new, configs and generators outside `lib/`), then confirm by regenerating, not reading.
- Update the map in `docs/architecture.md` in the same commit.

### Diagnostics and hints

> [!REQUIRED]

**Error and warning classes live in `lib/errors/`**, whatever raises them; the raising plugin stays where it belongs.

A hint reuses existing reporting: `SizeLimitsPlugin` and `DuplicatePackagesPlugin` both end in `hints === "error" ? compilation.errors : compilation.warnings`; hardcoding one list makes a hint impossible to escalate. Prefer an option saying _whether_ to run the check and leave severity to `performance.hints`.

**`makeSerializable` follows from where a diagnostic is created**: register one reachable from a module, not one pushed onto `compilation.warnings` after seal, and cover a new diagnostic under `ConfigCacheTestCases` ([why](docs/caching.md#diagnostics)).

## Code conventions

### Source language: CommonJS + JSDoc

`lib/` is CommonJS only: `module.exports` / `require()`, never `import`/`export`. Types are JSDoc (`@typedef {import("./Other")} Other` etc.), never TypeScript syntax in `.js` files; `yarn fix:special` compiles them into `types.d.ts`.

### Type annotations

Use the most specific real type. `EXPECTED_ANY`, `EXPECTED_OBJECT`, `EXPECTED_FUNCTION` (aliases for `any`, `object`, `Function`) are an escape hatch **only** for a value that genuinely can be any value/object/function — never when a real type fits. Likewise `unknown` is for a type you can't yet name (then narrow); prefer a real type such as `import("…").Foo`. Applies in `test/` too.

When a function's output type depends on its input, use a generic (`@template`) rather than widening, so callers stay precisely typed.

### Naming

Spell names out in full (`attributeCount`, not `attrCnt`), beyond the abbreviations webpack already uses pervasively. Name a class for what it does, with its kind's suffix (`*Plugin`, `*Dependency`, …), and the file for the class; a name never invents a role suffix (`*Manager`, `*Util`), takes a `Webpack` prefix or repeats another `lib/` class. Exceptions and reasons: [docs/code-style.md](docs/code-style.md#naming).

### Path regexps and helpers live in one file

> [!REQUIRED]

Path-shape regexps and their helpers live in `lib/util/identifier.js`: **import from there — never re-declare a local copy**, even a one-liner like `/\\/g`. Export one that is defined but not exported; define one locally only when nothing fits ([details](docs/code-style.md#path-regexps-and-helpers-live-in-one-file)).

### No private exports

> [!REQUIRED]

**Never add a `_`-prefixed export** (`module.exports._foo`) to any file in the project to share an internal helper with another file: every export is reachable, so other developers come to depend on it and it can't change freely. Keep the helper in the one file that uses it, or move the logic so one file owns it; a helper useful in its own right is exported under a public name with full JSDoc instead, as the HTML and CSS `escape*` / `decode*` helpers are. **The only exception is testing**: a private export a test needs to reach code no public entry point can.

### Don't enumerate module or source types

> [!REQUIRED]

A list of module, source or dependency types in `lib/` is silently wrong the day a type is added. Read [docs/code-style.md](docs/code-style.md#dont-enumerate-module-or-source-types) before writing one; the rules it enforces:

- **Ask the object** (`module.getSourceTypes()`, `chunkGraph.getModuleSourceTypes(module)`, `moduleGraph.getParentModule(dependency)`).
- **Ask the kind, not the class** (`module.is("css")`, `isDependencyKind(dependency, "url")`); keep `instanceof` for built-ins and plain values.
- **A feature flag is the same list in disguise.**
- **Let an unknown type take the safe side**; avoid a list whose `else` does nothing.

### Source file headers

Every source file in `lib/`, `hot/` and `tooling/` opens with the MIT license header. A **new** file's `Author` line names its actual author (`Author <Name> @<github-handle>`) — never copied from another file.

### Code comments

> [!REQUIRED]

Full rules, exemptions and the `WHY:` example: [docs/code-style.md](docs/code-style.md#code-comments). The rules it enforces:

- **A plain comment is at most three lines. Count them.** Every `//` and `/* … */` in `lib/`, `hot/`, `tooling/` and `test/`, and every comment a generator emits; `webpack/comment-length` fails `lint`. Only `examples/` is exempt.
- **Exempt, none of them commentary**: JSDoc, the block before a file's first statement, and a comment opening `// WHY:` — and `WHY:` only when every line carries something the code can't.
- Each line carries what code can't (a hidden invariant, an ordering constraint, a workaround, the concept's name); **never** restate the next line, narrate the diff, recap the PR or quote your task.
- **Every named function gets a JSDoc block** with every tag that applies; never shorten, flatten or delete a tag, or trade the block for a `//` comment plus an inline `/** @type {T} */` cast.
- **The description above the tags is at most two sentences**; prose about a documented symbol goes inside its JSDoc.

### Marking work for the next major

> [!REQUIRED]

Work waiting for the next breaking release is marked `// TODO in the next major release: <what to do>` in every file type — **never name a version** (in the marker, the prose beside it or a `@deprecated` tag) and **always say what to do**. Examples and the one-command list: [docs/code-style.md](docs/code-style.md#marking-work-for-the-next-major).

### A dependency's bug is fixed in the dependency

When the root cause is in a dependency (`watchpack`, `enhanced-resolve`, `webpack-sources`, …), **fix it there**: a PR to that repository with its own test, never a workaround in `lib/`, which hides the bug from every other user of the package. The webpack PR then only bumps the dependency to the release carrying the fix, plus a regression test showing webpack's symptom gone. Only if the requester asks for a stopgap, open its comment with `// WORKAROUND(<package>):` naming the gap, so `grep -rn "WORKAROUND(" lib` lists what to remove after the bump.

## Testing

Directory structure, naming and running one case: [TESTING_DOCS.md](TESTING_DOCS.md).

**For bug fixes, write the test first**, confirm it fails, then fix and re-run. For features, tests may come alongside or after.

**Prefer integration tests** (`configCases/`, `watchCases/`, `hotCases/`, `statsCases/`, …) driving a real `webpack()` build whenever the behavior is reachable that way — they catch regressions mocked unit tests miss. Use `*.unittest.js` only for pure helpers a build can't naturally reach.

**Behavior across rebuilds is a `watchCases/` case, never a unit test calling `compiler.run` in a loop** ([how](TESTING_DOCS.md#writing-a-test)).

**Snapshot printed code; assert everything else** — never snapshot a value some machine can't produce, and keep control characters out ([details](TESTING_DOCS.md#writing-a-test)).

Run targeted tests only — `yarn test:base --testPathPatterns="<pattern>"` or `-t "<name>"` — covering the touched code, and leave broad suites to CI. Never bare `yarn jest`/`npx jest` (see [Commands](#commands)); no `yarn test` unless asked; eyeball the diff before `yarn test:base -u`.

> [!REQUIRED] > **Two kinds of change widen the blast radius** — touching `schemas/**`, `lib/config/**` or anything `yarn fix:special` generates. Still don't sweep suites locally: run only the touched `configCases/`, `yarn lint:code` and `yarn fix:special`, push, and let CI sweep. A red `lint`, `basic` or `unit` stops every integration upload, so a coverage drop then isn't one ([details](docs/verifying.md#changes-that-widen-the-blast-radius)).

> [!REQUIRED] > **Run every stage of `lint` before every push — `yarn lint`, not a chosen few, not only your files**, and read each stage's output whole, never through `tail`/`grep`. A generated file is stale as soon as any JSDoc it copies changes, prose included ([details](docs/verifying.md#running-lint)).

A local failure is yours only if it doesn't reproduce on `main` (check in a worktree). **Hard rule — no broad local sweeps** (spec-conformance suites, the full `test:integration` matrix); **never read pass/fail through a pipe**; **never attribute a failure without a base run** of that exact case. Known sandbox failures and why: [docs/verifying.md](docs/verifying.md#local-failures-and-broad-sweeps).

**When a check takes longer than a few minutes, let CI run it**: the minify corpora, a spec-conformance suite, a benchmark. Run the fast checks, push, then wait for CI's result rather than running the long check locally in parallel ([details](docs/verifying.md#long-checks-belong-to-ci)).

Running one integration case, and what a `configCases/` case contains: [TESTING_DOCS.md](TESTING_DOCS.md#running-one-integration-case).

**Cover every line you add or change** — a commit must not lower coverage (CI enforces patch coverage, target 90%+). Every new branch, fast path and fallback needs a test: `configCases/` when a real build reaches it, a focused `*.unittest.js` only when a config case can't reasonably drive it or adds nothing (e.g. tokenizer cold-path fallbacks, where fast and delegated branches each still need exercising). Check with `yarn cover:unit` or the PR's "patch" report until no changed line is missing.

A language's syntax (`lib/{css,html,javascript,json}` tokenizer, parser, printer and minifier) is held to its **own** unit tests: `yarn test:syntax-coverage [css|html|javascript|json]` fails when what they never run grows past `tooling/syntax-coverage.json`; `--list` prints it, `--write` lowers the baseline once you covered more.

**Don't lower type coverage either.** CI collects it (`yarn types:cover:report`) and reports the delta on the PR. Prefer real types over `EXPECTED_ANY` ([Type annotations](#type-annotations)), and run `yarn types:cover` if you widened any annotation.

### Read CI rather than re-running it

> [!REQUIRED]

**When CI is red, read its log instead of reproducing the whole job locally**, then reproduce **only the named case**. Save logs and large reports to a file and grep them rather than reading them inline, and re-fetch check runs only when a push, re-run or CI event changed them. Commands and traps (a step is not a job; `yarn lint` stops at its first failing stage): [docs/verifying.md](docs/verifying.md#read-ci-rather-than-re-running-it).

### Verifying a performance or memory change

> [!REQUIRED]

Read [docs/performance.md](docs/performance.md) before claiming or measuring a performance, memory or emitted-size change. In short: prefer counting over CPU-profile attribution over retained heap over wall timing, inside a real build, never a micro-benchmark; for size, gzip decides and a re-encoding must show a compressed win; `readWord`, `readString` and `finishToken` in `lib/javascript/syntax-parser.js` sit just under V8's inlining budget — check their bytecode size before and after touching them.

## Git & PR rules

> [!REQUIRED]

**Read [docs/pull-requests.md](docs/pull-requests.md) in full once per session, before branching, committing or opening a PR**; PR events don't need a re-read — it holds the changeset format, branch and commit conventions, the PR body template and how to drive the PR to green. The rules it enforces:

- **Changeset**: every user-facing change needs one in `.changeset/` — one sentence, one per PR.
- **Branch** `<type>/<short-description>`, the type picked from the diff and matching the PR's "What kind of change…" answer; never a `claude/`, `bot/`, `ai/` or other tool prefix. Rename before the first push; a task leaves one branch on `origin` and ends with a `Branches on origin:` line.
- **Commit author** is the requester's GitHub account, never a bot; no `Co-authored-by` trailers; ask when the identity is unknown.
- **Open from a branch not behind `main`**: rebase, never merge `main` in.
- **PR body**: paste the org template yourself with every section, bold labels spelled exactly and `n/a` where one doesn't apply, including **Use of AI** and a **What kind of change…** answer matching the branch prefix. Write it briefly and simply; for a fix or improvement, show a real before/after (code, output, size, memory or CPU) under **Summary**.
- **Subscribe to every PR you open** and unsubscribe once CI is green and every automated review is handled, or the requester says stop; a PR waiting only on human review needs no live session.
- **Never post to GitHub on your own initiative** — comments, review replies, PR body edits after opening (except installing the template over an auto-created body), replies to bots other than CodeRabbit. Bring the finding and your draft reply into the session.
- **Resolve CodeRabbit threads yourself** as described in [docs/pull-requests.md](docs/pull-requests.md#after-opening-the-pr--wait-for-the-automated-reviews).
- **Don't rebase or merge the base branch into an open PR unasked.**
- **A question is not a go-ahead**: asked what happened, why, or whether you changed something, answer and propose the change, then push only once the requester agrees, even to fix your own mistake. A request phrased as a question ("could you…?") is still a request.
- **Every check ends green**; read coverage only once every uploading suite has reported.
- **A wake that changes nothing ends with no message** — PR events, check-ins, background-task and subagent notifications alike, even when the harness asks for visible output or says the user hasn't heard from you.

## Do not touch

> [!REQUIRED]

Produced by `yarn fix:special` — never edit by hand:

- `types.d.ts` — from JSDoc + schemas.
- `schemas/**/*.check.{js,d.ts}` — precompiled schema validators.
- Generated runtime code under `lib/` (`tooling/generate-runtime-code.js`).
- `lib/css/data.js`, `lib/html/data.js`, `lib/javascript/data.js`, `lib/javascript/syntax-printer-data.js`, `lib/javascript/parse-error-codes.js` — every lookup table the CSS minifier, HTML parser/minifier and JS parser and printer read, by `tooling/generate-css-data.js`, `generate-html-data.js` and `generate-js-data.js`; `generate-html-data.js` also writes the `// #region html entities` block in `lib/html/syntax-parser.js`. Sources and contents: [docs/syntax.md](docs/syntax.md#generated-tables).

A `syntax-parser.js` or `syntax-printer.js` is algorithm only — a new lookup table belongs in the matching generator. Generator-written regions such as `// #region html entities` are the exception; `syntax.js` is a facade, neither.

How a generator derives its tables and per-construct descriptors: [docs/syntax.md](docs/syntax.md#generated-tables).

`declarations.d.ts`, `declarations.test.d.ts` and `module.d.ts` _are_ editable.

Re-run `yarn fix:special` **before the next commit** after touching:

- An option type in `lib/**/*.js` or `declarations/**/*.ts` — rewrites that schema, its validator and `types.d.ts`.
- JSDoc in `lib/**/*.js` reachable from a public export — `types.d.ts`.
- `tooling/generate-runtime-code.js`, `generate-wasm-code.js`, `generate-css-data.js`, `generate-html-data.js`, `generate-js-data.js`, or anything they consume (incl. the `acorn` / `mdn-data` / `color-name` / `@webref/*` versions in `package.json` and `tooling/html-entities.json`).

CI's `lint` job verifies these are current; `yarn fix` (`fix:code` + `fix:special` + `fmt`) is the preferred final step.

## Gotchas

### Target the Node baseline

`lib/` and `hot/` ship as raw source (no build step) and must run on **Node ≥ 10.13** (CI goes down to 10.x): no newer syntax or APIs, e.g. no `?.` or `??`, or it passes locally and fails the Node 10 job.

**This covers what tests execute too**: webpack doesn't transpile fixtures, so newer syntax in a `configCases/` fixture fails the Node 10 job. Write fixtures in baseline syntax; where the syntax _is_ the point, gate the case with a `test.filter.js` ([example](docs/code-style.md#target-the-node-baseline)) — unrelated to the cache-suite silencing forbidden [below](#the-persistent-cache-has-to-keep-working).

### Runtime code ships to every target

Runtime-emitting code (chunk loading, resource hints, library and externals presets) is **per-target**: apply a change to **every** affected target with an integration case per target, then check wire cost with `yarn test:size` and say in the PR what moved. Targets, the universal runtime's DOM guard and how to read the size report: [docs/runtime.md](docs/runtime.md).

### Keep emitted runtime small

> [!REQUIRED]

**Emitted runtime is paid for in every user's bundle, so emit the shortest equivalent.** Read the checklist in [docs/runtime.md](docs/runtime.md#keep-emitted-runtime-small) before writing or changing an emitted string; the rules it enforces:

- **Never hand-write a form a `RuntimeTemplate` helper covers** (`function(`, `var`, `x = x || y`, `hasOwnProperty.call`, `a && a.b`): the helper picks the shortest form per `output.environment`.
- **Minifiers can't do it for you**: unused parameters, guards on values already known to be set, repeated property chains and default arguments survive terser.
- **Emit only what this config runs**: gate code a feature, HMR or the import's usage needs behind that condition.
- **Equivalence covers falsy values, prototype keys, the ES5 fallback and third-party overrides**; keep a guard you can't prove dead.

### Lint covers every file, docs included

`lint` runs Prettier (`fmt:check`) and cspell (`lint:spellcheck`) over the **whole repo**, Markdown and this guide included. Run `yarn fix` before pushing even a docs change: an unaligned Markdown table or unknown word fails `lint` alone. Add a genuine new word to `words` in `cspell.json` (or reword); Prettier reformats Markdown tables, so hand-written columns must match its output.

### The persistent cache has to keep working

> [!REQUIRED]

**Read [docs/caching.md](docs/caching.md) whenever `ConfigCacheTestCases` fails.** The rules it enforces:

- `Pack got invalid because of write to: <identifier>` means work redone every incremental build: **treat it as a defect and find the cause**.
- Every new serializable class (`Module`, `Dependency`, error subclass, cached value) calls `makeSerializable(...)`; `yarn fix:serializables` regenerates `internalSerializables`.
- Deserialization re-enters a constructor with **no arguments**, so one dereferencing a parameter must guard.
- **Never silence it with `test.filter.js`**; a new case passes both suites (post-baseline syntax gating is different — [Target the Node baseline](#target-the-node-baseline)).
- Only a case whose subject is a build error may expect the write, via `infrastructure-log.js`; any other expectation states why it isn't a bug.

### Performance and memory

Users measure webpack by build time and peak heap. Much of `lib/` sits on per-module hot paths (sometimes per module × runtime, or per chunk × module), so constant factors compound: weigh time and memory in every change, bug fixes and refactors included. Less allocation, smaller `Map`/`Set` footprints and fewer closures retained on hot paths are wins. For any per-`Compilation` state, ask whether it can be released after seal/emit so large structures aren't retained longer than needed (see #15521). Sanity-check perf changes with `FILTER="<case-name>" yarn benchmark` before CI's benchmarks flag them.

### Startup cost

Every process starts cold, and loading code is most of that start, so pay only for what this input and these options use:

- **Load on first use**: reach a module that some inputs or options never need through one lazy accessor, not an import at the top of the file.
- **Keep cheap things light**: constants and option helpers callers need live apart from the heavy code that uses them.
- **Turned-off work costs nothing**: build tables, regexes and closures on first use, not at load or construction.
- **Prove it by counting** which modules a fresh process loads, not by timing it.

### Keep instance shapes stable

Initialize **every** instance field in the constructor (`undefined`/`null` for those first assigned later) and never `delete` one — set it to `undefined`; symbol-keyed sparse slots are the documented exception. Why (V8 shapes, inline caches, `wrong map` deopts): [docs/performance.md](docs/performance.md#keep-instance-shapes-stable).

Adding a public (non-`_`) field to a class compiled into `types.d.ts` needs `yarn fix:special` — constructor order sets member order in the generated declarations.
