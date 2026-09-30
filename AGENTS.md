# Webpack Development Guide

## Conventions in this guide

A `> [!REQUIRED]` callout directly under a heading makes that whole section **mandatory**: follow it exactly — do not paraphrase, skip, or substitute a similar-looking convention from other tooling. Reviewers keep flagging skipped or partly filled REQUIRED sections (especially the [Pull request body](docs/pull-requests.md#pull-request-body)), and every such skip blocks the PR — so re-read each one in full whenever it applies instead of relying on memory or a previous task's output. Sections without the callout are guidance — apply judgement.

**Editing this guide.** Keep every change short and simple. Every session loads this file whole, so each line costs every task:

- **Size budget: 40,000 characters**, where Claude Code starts warning about a large instruction file. `yarn lint:agents` (part of `yarn lint`) enforces it; over budget, move a task-specific section to `docs/<topic>.md`, leaving its heading, its `[!REQUIRED]` callout, one line per rule it enforces and a link.
- **What stays here**: rules every task needs — "never" prohibitions, conventions touching every edit, gotchas that look safe but aren't. **What moves**: workflows for one kind of task, reference material, explanations of a tool, maps.
- **Never drop a rule, fact, number or reason to shorten** — move it verbatim, or reword or merge.
- **One fact, one place**: link instead of restating, and don't copy what the repo already says (a directory listing, the `package.json` scripts, a signature).
- **Docs live in `docs/`**, never `lib/` (it is published); renaming a heading breaks its `#anchor` links, so grep for them.

## Commands

Use **yarn**, not npm. Every command is a `package.json` script; these are the ones whose use isn't obvious from the name:

- `yarn fix` — `fix:code` (ESLint) + `fix:special` + `fmt` (Prettier). Prefer as the final step.
- `yarn fix:special` — Regenerate `types.d.ts`, declarations, schema validators and generated runtime code.
- `yarn lint` — What CI runs: ESLint + the `AGENTS.md` size budget + generated-output checks + every `tsc` project + Prettier + spellcheck.
- `yarn test:base --testPathPatterns="<pattern>"` / `-t "<name>"` — Targeted tests; `-u` updates snapshots (eyeball the diff first).
- `yarn test` — Full suite — only when asked.

Every other script, with what it does: [TESTING_DOCS.md](TESTING_DOCS.md#more-scripts).

Never run `yarn jest`/`npx jest`: the required `--experimental-vm-modules` flag lives only in `test:base`, and bare jest crashes the ESM/test262 suites. Running a single case: [TESTING_DOCS.md](TESTING_DOCS.md).

**CI must come back fully green** ([details](docs/pull-requests.md#after-opening-the-pr--every-check-ends-green)); read the job list from `.github/workflows/`, not memory. Two jobs are unusual — watch both when touching hot paths or large fixtures: the benchmark's memory mode is sensitive to fixture size and to which cases share its process, and the Bun job runs under `--smol` and surfaces OOMs Node doesn't. Every job costing more than a few minutes waits on `lint`, `basic` and `unit` (needed for merge anyway), so while one of them is red most of the run reports `skipped`. That includes the benchmarks: on a PR `test.yml` calls `benchmarks.yml` behind those three (reported as `benchmarks / benchmark (1/4)`); on `main` nothing gates them (plain `benchmark (1/4)`) so CodSpeed always has a baseline.

## Architecture

> [!REQUIRED]

The canonical repository map is [docs/architecture.md](docs/architecture.md) — read it before placing, moving or looking for a file. **When you add, rename or remove a top-level directory** (under the repo root, `lib/`, `test/` or `schemas/`), update its bullet there in the same commit — CI doesn't check it, only humans catch drift. If a directory fits no group, add a group rather than dropping the entry.

Rules the map carries that apply everywhere:

- **A plugin never belongs in `lib/` root**: it goes in the directory for what it acts on (asset set → `lib/output/`, module graph → `lib/optimize/`, entry → `lib/entry/`); if none fits, add a directory, with its bullet in the map, in the same commit.
- **Documentation lives in `docs/`**, never under `lib/`, which is published (`package.json` `files`); docs about `test/` or `tooling/` may sit in those directories.
- **Edit an option's declaration, never its schema**: JSDoc typedefs in `lib/` for a plugin, `declarations/WebpackOptions.ts` for the configuration; `generate-schemas.js` derives `schemas/**`.
- **Git submodules** live under `test/external/`, fetched on demand and always `--depth 1` (`wpt` alone is ~161k files); each is described in [TESTING_DOCS.md](TESTING_DOCS.md#external-test-corpora).

**Adding or renaming a webpack option** touches every layer in order — type, defaults, normalization, implementation, generated output and five snapshot files no `configCases/` pattern matches — and skipping one silently breaks the option: read [docs/options.md](docs/options.md) first, which also covers the `@since`/`@experimental` JSDoc keywords and what `webpack/valid-schema` rejects.

> [!REQUIRED] > **Never hand-edit what `yarn fix:special` generates**, even when it also reformats files you didn't touch. That churn means your toolchain resolved differently from CI's: commit only your own hunks, then **verify them against the generator** (re-run and diff) — never hand-write what you think it would emit. A hand-written JSDoc block missing the `@since` line the schema's `added` keyword produces, or a `types.d.ts` member the JSDoc implies, fails `lint` with only `… need to be updated`.

**A nested minifier needs the outer one's options.** `lib/html/htmlMinify.js` runs the CSS minifier over inline `<style>` and every `style=""`, so `output.environment` must reach both, or a `.css` asset and the same declaration inline disagree about what the target reads. Any future HTML-minifies-JS hook has the same obligation.

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

Spell names out in full (functions, variables, parameters, properties): `insertHtmlElement` not `insHtmlEl`, `attributeCount` not `attrCnt`, `current` not `cur`, `element` not `el`. Exceptions: abbreviations webpack already uses pervasively (`ast`, `ns`, `id`, `url`, `css`, `js`, `dir`, `env`, `fs`) or spec-defined ones (`afe` — the HTML spec's active formatting elements), and throwaway loop indices (`i`, `j`, `k`). Otherwise write the full word.

**Name a class for what it does, and the file for the class.** The name says the idea, and ends in the suffix its kind uses — `*Plugin`, `*Dependency`, `*RuntimeModule`, `*Warning`, `*Error`, `*Module`, `*Factory`, `*Generator`, `*Parser`, `*Template` (546 of 668 PascalCase files in `lib/`). A file exporting one class takes that name; where the two disagree, rename whichever is wrong — often the file. Exempt: core nouns (`Compiler`, `Chunk`), helper and data-structure modules, and any module exporting several things.

**A name never** invents a role suffix (`lib/` has no `*Controller`, `*Manager`, `*Service` or `*Util` — a class that controls a thing is the thing), carries a `Webpack` prefix where the bare word is free, or repeats another class in `lib/`, since a stack trace and `types.d.ts` show the name alone.

### Path regexps and helpers live in one file

> [!REQUIRED]

`lib/util/identifier.js` is the single home of path-shape regexps (`ABSOLUTE_PATH_REGEXP`, `WINDOWS_ABS_PATH_REGEXP`, `WINDOWS_PATH_SEPARATOR_REGEXP`, …) and the helpers built on them (`parseResource`, `makePathsRelative`, `contextify`, `absolutify`, `getUndoPath`, …). **Import from there — never re-declare a local copy**, even a one-liner like `/^[a-z]:[\\/]/i` or `/\\/g`; duplicates drift into subtly different definitions of "absolute path" or "separator".

Before writing a path-shape regexp, read the top of that file and its `module.exports`. If what you need is defined but not exported, **export and import it**. Define one locally only when nothing fits, next to the single function using it.

### Don't enumerate module or source types

> [!REQUIRED]

A list of module, source or dependency types in `lib/` claims those are all there will ever be; the day one is added it is silently wrong, and the new type takes whichever branch the list forgot. Instead:

- **Ask the object.** `module.getSourceTypes()`, `chunkGraph.getModuleSourceTypes(module)`, `moduleGraph.getParentModule(dependency)` answer for whatever exists, plugin types included. Know `getParentModule`: concatenation re-points an incoming connection at the javascript module absorbing the referencing one, so `connection.originModule.type` reads `javascript` for a css `url()` or html `src`, while the dependency's own module still reads `css`/`html`.
- **Match the class, not its name.** `dependency instanceof URLDependency` says what `dependency.type === "new URL()"` only approximates, and survives renames.

**A feature flag is the same list in disguise**: gating on `options.experiments.<x>` to mean "which types can exist here" reads like configuration but goes stale the same way.

When a branch must name types, **let an unknown type take the safe side**: name the special case and let the rest fall to the general answer (`typePrefixEquals(type, JAVASCRIPT_TYPE)` … `else` reads the asset url), or list what provably needs nothing and treat the rest as needing it (`TYPES_WITHOUT_CHUNK_HANDLER`). Avoid a list whose `else` does nothing.

### Source file headers

Every source file in `lib/`, `hot/` and `tooling/` opens with the MIT license header. A **new** file's `Author` line names its actual author (`Author <Name> @<github-handle>`) — never copied from another file.

### Code comments

> [!REQUIRED]

**A plain comment is at most three lines. Count them.** This binds every `//` and `/* … */` in `lib/`, `hot/`, `tooling/` and `test/`, and every comment a generator emits. A fourth line is over however short or true — split, cut or drop it. `webpack/comment-length` enforces it repo-wide (`lib/` included; `yarn lint:code` shows it, over whole files, reading comment tokens only, so comment-like text in strings doesn't count) and fails `lint`. Only `examples/` is exempt: a commented-out config there is what readers copy, and the prose is the example's documentation.

**Three things are exempt, none of them commentary**: JSDoc (a type contract); the block before a file's first statement (documents the file like the license header — a `"use strict"` between them doesn't end it); and a comment whose first line opens `// WHY:`, stating why code is shaped as it is — spec prose behind a `SUPPLEMENT` entry, a measured engine disagreement, a constraint another file depends on — which can't be shortened without loss:

```js
// WHY: Chromium reads an Oklch hue as missing well before the chroma reaches
// zero — measured: kept at 0.02, dropped at 0.015 — where CSS Color 4 §4.4
// makes it powerless only at zero. So a color in that band has no answer two
// engines agree on, and a mix naming one is left as it stands.
```

`WHY:` is not a way to keep a long comment: use it only when every line carries something the code can't, and expect a reviewer to ask which line that is (`grep -rn "// WHY:"` shows how often it's used).

Each surviving line must carry what code can't: a hidden invariant, an ordering constraint, a workaround, or the name of the concept implemented. **Never** restate the next line, narrate the diff, recap the PR, or quote your task.

**JSDoc tags are exempt**, multi-line by construction. Every named function gets a block, module-scope helpers included: one `@param` per parameter, `@returns`, `@template`/`@typedef` where they apply. Never shorten, flatten or delete a tag, and never trade a JSDoc block for a `//` comment plus an inline `/** @type {T} */` cast (that loses parameter and return docs; such casts are for throwaway callback arguments only).

**The description above the tags is prose, capped at two sentences**: what the function does when its name doesn't say, plus the one constraint a caller needs. An essay moved from `//` into JSDoc is the same essay; algorithm explanations, history and alternatives belong in neither. Prose about a documented symbol goes inside its JSDoc, never as a `//` comment above or instead of it.

### Marking work for the next major

> [!REQUIRED]

Work waiting for the next breaking release uses one wording, in every file type:

```js
// TODO in the next major release: remove, `css-url` is the old spelling of `asset-url`
```

**Never name a version**, in the marker or the prose beside it (`TODO webpack 6`, `TODO remove in webpack 6`, `TODO webpack6 - …`, `TODO webpack@6`, `TODO reconsider this for webpack 6` — one cleanup got written a dozen unsearchable ways). A number goes stale when that major ships and the work slips to the next; a `@deprecated` tag or description of what the next major does takes the same phrase.

**Always say what to do** — a bare marker tells the branch doing the work nothing. It is a plain comment, so the [three-line limit](#code-comments) applies. The whole list is then one command, which is the point of the single wording:

```sh
grep -rn "TODO in the next major release" codecov.yml bin hot lib setup test tooling
```

## Testing

Directory structure, naming and running one case: [TESTING_DOCS.md](TESTING_DOCS.md).

**For bug fixes, write the test first**, confirm it fails, then fix and re-run. For features, tests may come alongside or after.

**Prefer integration tests** (`configCases/`, `watchCases/`, `hotCases/`, `statsCases/`, …) driving a real `webpack()` build whenever the behavior is reachable that way — they catch regressions mocked unit tests miss. Use `*.unittest.js` only for pure helpers a build can't naturally reach.

**Behavior across rebuilds is a `watchCases/` case, never a unit test calling `compiler.run` in a loop** ([how](TESTING_DOCS.md#writing-a-test)).

**Snapshot printed code; assert everything else** — never snapshot a value some machine can't produce, and keep control characters out ([details](TESTING_DOCS.md#writing-a-test)).

Run targeted tests only — `yarn test:base --testPathPatterns="<pattern>"` or `-t "<name>"` — covering the touched code, and leave broad suites to CI. Never bare `yarn jest`/`npx jest` (see [Commands](#commands)); no `yarn test` unless asked; eyeball the diff before `yarn test:base -u`.

> [!REQUIRED] > **Two kinds of change widen the blast radius.** Touching `schemas/**`, `lib/config/**`, or anything `yarn fix:special` generates moves the whole option surface. Still don't sweep suites locally: push, let CI sweep, and [read the failing job's log](#read-ci-rather-than-re-running-it). Locally run only the touched `configCases/`, `yarn lint:code` and `yarn fix:special` (whose output says whether a generated file is stale). `lint`, `basic` and `unit` gate the `integration` matrix in `.github/workflows/test.yml` (`integration: needs: [lint, basic, unit]`), so a red one — `lint` included — stops every integration upload, and coverage then computes patch coverage from whichever cheap suite did report: it reads like a coverage problem but isn't.

> [!REQUIRED] > **Run every stage of `lint` before every push — not a chosen few, not only your files.** `yarn lint:types` plus `npx eslint <files>` is **not** "lint passed": it skips `lint:special` (fails on stale generated files) and `lint:spellcheck` (reads every Markdown file). `yarn fix` isn't it either — it regenerates and formats but doesn't type check or spellcheck — so **run `yarn lint` after it** (or all ten stages by hand if an early one trips on sandbox drift). Read each stage's output whole: piping through `tail`/`grep` is how a finding just above the summary reaches CI instead of you.
>
> **A generated file is stale as soon as any JSDoc it copies changes — prose included.** `types.d.ts` carries the comment above `process()`, not just its signature; a reworded comment, or a signature edited without its doc paragraph, fails `lint` with the same `types.d.ts need to be updated` a missing member gives. After splicing your hunks, diff your file against the generator's whole output for that symbol's **region**, not just the lines you meant to change.

`yarn lint` is an `&&` chain, so the first stage tripping on sandbox drift hides the rest. If `lint:special` reports declarations "need to be updated" that `main` reports too, run the rest by hand: `lint:agents`, `lint:types`, `lint:types-test`, `lint:types-benchmark`, `lint:types-module-test`, `lint:types-hot`, `fmt:check`, `lint:spellcheck`. `lint:types-test` catches `tsc` errors in `test/`; skipping it is how a red `lint` survives "lint passed locally".

A local failure is yours only if it doesn't reproduce on `main` — check in a worktree (`git worktree add <dir> origin/main`) first. Sandboxes routinely fail `Cli createColors`, `profiling-plugin` and the `many-replacements` cases for environment reasons, and the generated-declaration check flags files CI accepts. **Hard rule — no broad local sweeps**: never run the spec-conformance suites (`test:test262` alone takes tens of minutes, `test:html5lib`, `test:css-parsing`) or the full `test:integration` matrix as routine local verification — CI runs them on every push; locally, run the `configCases/` relevant to your change. Broad local sweeps cost minutes and, on a busy machine, manufacture timeouts that look like regressions. Narrow the pattern until a run takes seconds, and:

- **Never read pass/fail through a pipe** — `yarn test:base … | grep …` discards jest's exit code. Check the exit status or read the `Tests:` line.
- **Never attribute a failure without a base run** — re-run that exact case on unmodified files first; most surprises are pre-existing or contention flakes.

Running one integration case, and what a `configCases/` case contains: [TESTING_DOCS.md](TESTING_DOCS.md#running-one-integration-case).

**Cover every line you add or change** — a commit must not lower coverage (CI enforces patch coverage, target 90%+). Every new branch, fast path and fallback needs a test: `configCases/` when a real build reaches it, a focused `*.unittest.js` only when a config case can't reasonably drive it or adds nothing (e.g. tokenizer cold-path fallbacks, where fast and delegated branches each still need exercising). Check with `yarn cover:unit` or the PR's "patch" report until no changed line is missing.

**Don't lower type coverage either.** CI collects it (`yarn types:cover:report`) and reports the delta on the PR. Prefer real types over `EXPECTED_ANY` ([Type annotations](#type-annotations)), and run `yarn types:cover` if you widened any annotation.

### Read CI rather than re-running it

> [!REQUIRED]

**When CI is red, read its log instead of reproducing the whole job locally** — rediscovering one line by re-running `yarn lint` or a suite wastes minutes and tokens. Filter the run to failing jobs (`gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion=="failure")'`, or `list_workflow_jobs`), read that job's log (`gh run view --job <id> --log-failed`, or `get_job_logs` with `return_content`, asking for enough lines to clear the trailing `Post job cleanup`), then reproduce **only the named case**: `yarn test:base --testPathPatterns="<file>"`, `yarn test:basic --testNamePattern="<category> <case>"`, or `npx eslint <file>`.

Traps: a step is not a job — `Run yarn lint` sits inside the `lint` job, and a step's id fetches the wrong log, so select the object with a `steps` array. And `yarn lint` stops at its first failing stage, so a CI failure in `lint:code` says nothing about later stages — just as a local `lint:special` complaint `main` also makes says nothing about CI.

### Verifying a performance or memory change

> [!REQUIRED]

Read [docs/performance.md](docs/performance.md) before claiming or measuring a performance, memory or emitted-size change. In short: prefer counting over CPU-profile attribution over retained heap over wall timing, inside a real build, never a micro-benchmark; for size, gzip decides and a re-encoding must show a compressed win; `readWord`, `readString` and `finishToken` in `lib/javascript/syntax-parser.js` sit just under V8's inlining budget — check their bytecode size before and after touching them.

## Git & PR rules

> [!REQUIRED]

**Read [docs/pull-requests.md](docs/pull-requests.md) in full before branching, committing or opening a PR, and on every event of a PR you opened** — it holds the changeset format, branch and commit conventions, the PR body template and how to drive the PR to green. The rules it enforces:

- **Changeset**: every user-facing change needs one in `.changeset/` — one sentence, one per PR.
- **Branch** `<type>/<short-description>`, the type picked from the diff and matching the PR's "What kind of change…" answer; never a `claude/`, `bot/`, `ai/` or other tool prefix. Rename before the first push; a task leaves one branch on `origin` and ends with a `Branches on origin:` line.
- **Commit author** is the requester's GitHub account, never a bot; no `Co-authored-by` trailers; ask when the identity is unknown.
- **Open from a branch not behind `main`**: rebase, never merge `main` in.
- **PR body**: paste the org template yourself with every section, bold labels spelled exactly and `n/a` where one doesn't apply, including **Use of AI** and a **What kind of change…** answer matching the branch prefix. Write it briefly and simply; for a fix or improvement, show a real before/after (code, output, size, memory or CPU) under **Summary**.
- **Subscribe to every PR you open** and stay subscribed until it is merged or closed, or the requester says stop.
- **Never post to GitHub on your own initiative** — comments, review replies, PR body edits after opening (except installing the template over an auto-created body), replies to bots. Bring the finding and your draft reply into the session.
- **Don't rebase or merge the base branch into an open PR unasked.**
- **Every check ends green**; read coverage only once every uploading suite has reported.
- **A wake that changes nothing ends with no message.**

## Do not touch

> [!REQUIRED]

Produced by `yarn fix:special` — never edit by hand:

- `types.d.ts` — from JSDoc + schemas.
- `schemas/**/*.check.{js,d.ts}` — precompiled schema validators.
- Generated runtime code under `lib/` (`tooling/generate-runtime-code.js`).
- `lib/css/data.js`, `lib/html/data.js`, `lib/javascript/data.js` — every lookup table the CSS minifier, HTML parser/minifier and JS parser read, by `tooling/generate-css-data.js`, `generate-html-data.js` and `generate-js-data.js`; `generate-html-data.js` also writes the `// #region html entities` block in `lib/html/syntax-parser.js`. Sources and contents: [docs/syntax.md](docs/syntax.md#generated-tables).

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

**This covers what tests execute too.** The harness runs each `configCases/` bundle, and webpack doesn't transpile fixtures (`output.environment` constrains only generated code), so a fixture using newer syntax — class static fields/blocks, `??=`, `await using` — fails the Node 10 job with a bare `SyntaxError` in the emitted bundle. When the syntax _is_ the point, gate the case with a `test.filter.js` returning `false` below the first supporting version, naming the syntax in a comment:

```js
"use strict";

// The fixture observes the name from a class static field, which Node 10
// cannot parse when the harness executes the bundle.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
```

Otherwise write it in baseline syntax so it runs everywhere. This capability gate is unrelated to the cache-suite silencing forbidden [below](#the-persistent-cache-has-to-keep-working) — a filtered case still runs in both suites wherever it can execute.

### Runtime code ships to every target

Runtime-emitting code (chunk loading, resource hints, library and externals presets) is **per-target**: apply a change to **every** affected target with an integration case per target, then check wire cost with `yarn test:size` and say in the PR what moved. Targets, the universal runtime's DOM guard and how to read the size report: [docs/runtime.md](docs/runtime.md).

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

### Keep instance shapes stable

Initialize **every** instance field in the constructor — `undefined`/`null` for those first assigned later. A first assignment outside the constructor forces a V8 hidden-class (Shape) transition, splitting instances across shapes: inline caches go polymorphic/megamorphic (a hot read can cost ~2× at two shapes, more when megamorphic), and code optimized for the first shape deopts with `wrong map`. Never `delete` a field (dictionary mode); set it to `undefined`. One trailing field gains little, but the rule is uniform so reviewers needn't judge case by case — it's why `Dependency` sets all its `_loc*` slots up front. Deliberate symbol-keyed sparse slots are the documented exception.

Adding a public (non-`_`) field to a class compiled into `types.d.ts` needs `yarn fix:special` — constructor order sets member order in the generated declarations.
