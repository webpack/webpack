# Webpack Development Guide

## Conventions in this guide

A `> [!REQUIRED]` callout directly under a heading makes that whole section **mandatory**: follow it exactly — do not paraphrase, skip, or substitute a similar-looking convention from other tooling. Reviewers keep flagging skipped or partly filled REQUIRED sections (especially the [Pull request body](#pull-request-body)), and every such skip blocks the PR — so re-read each one in full whenever it applies instead of relying on memory or a previous task's output. Sections without the callout are guidance — apply judgement.

**Editing this guide:** keep every change short and simple, and never drop a rule, fact, number or reason to shorten it — reword or merge instead.

## Project overview

webpack is a JavaScript module bundler: it builds a dependency graph from entry modules and emits optimized static assets (chunks) for browsers, Node.js and other targets. The config API is defined by JSON schemas, and everything is wired through `tapable` hooks.

**Core model:** a `Compiler` drives the build; each run creates a `Compilation` holding the module graph (`Module`s) and output `Chunk`s, which is `seal`ed and `emit`ted. Plugins expose `apply(compiler)` and tap the hooks they need.

## Tech stack

- **Language:** JavaScript. `lib/` is **CommonJS only**; types are JSDoc `@typedef`s compiled into `types.d.ts`.
- **Package manager:** **yarn** (not npm).
- **Tests:** jest, through the `test:base` wrapper (never bare `jest`).
- **Types:** TypeScript over the JSDoc annotations.

## Commands

All defined in `package.json` `scripts`.

- `yarn fix` — `fix:code` (ESLint) + `fix:special` + `fmt` (Prettier). Prefer as the final step.
- `yarn setup` — Install dependencies and link the checkout as `webpack`; non-interactive off a TTY.
- `yarn fix:special` — Regenerate `types.d.ts`, declarations, schema validators and generated runtime code.
- `yarn lint` — What CI runs: ESLint + generated-output checks + every `tsc` project + Prettier + spellcheck.
- `yarn tsc` — Type check the `lib/` JSDoc.
- `yarn validate:changeset` — Validate pending `.changeset/` files.
- `yarn test:base --testPathPatterns="<pattern>"` / `-t "<name>"` — Targeted tests.
- `yarn test:unit` — All `*.unittest.js`.
- `yarn test:integration` — Integration suites (`basictest`/`longtest`/`test`).
- `yarn test:test262` / `test:html5lib` / `test:css-parsing` — Spec-conformance suites.
- `yarn test:minify-corpora` — webpack's JS minifier vs the published one it replaces, byte for byte (errors included), over every JS corpus: terser's own `test/compress` and `test/input`, test262, and swc's minifier tests; where a test states what its input prints, the output is also run and must print it. `PHASES=` picks the printer phases installed; `JS_MINIFY_REPORT=<file>` writes where swc's recorded output is smaller.
- `yarn test:syntax-equivalence` — HTML/CSS printers vs a real browser's reading of their output (`configCases`, `wpt`).
- `yarn test:base -u` — Update snapshots (eyeball the diff first).
- `yarn test:size` — Generated-code size over all `configCases/` (per asset, plus runtime modules per runtime).
- `yarn cover:unit` — Unit-test coverage.
- `yarn types:cover` — Share of `lib/` that is precisely typed.
- `yarn build:examples` — Build `examples/` (verify after changing options).
- `yarn test` — Full suite — only when asked.

Never run `yarn jest`/`npx jest`: the required `--experimental-vm-modules` flag lives only in `test:base`, and bare jest crashes the ESM/test262 suites. Running a single case: [TESTING_DOCS.md](TESTING_DOCS.md).

**CI must come back fully green** ([details](#after-opening-the-pr--every-check-ends-green)); read the job list from `.github/workflows/`, not memory. Two jobs are unusual — watch both when touching hot paths or large fixtures: the benchmark's memory mode is sensitive to fixture size and to which cases share its process, and the Bun job runs under `--smol` and surfaces OOMs Node doesn't. Every job costing more than a few minutes waits on `lint`, `basic` and `unit` (needed for merge anyway), so while one of them is red most of the run reports `skipped`. That includes the benchmarks: on a PR `test.yml` calls `benchmarks.yml` behind those three (reported as `benchmarks / benchmark (1/4)`); on `main` nothing gates them (plain `benchmark (1/4)`) so CodSpeed always has a baseline.

## Architecture

> [!REQUIRED]

The canonical repository map is [docs/architecture.md](docs/architecture.md) — read it before placing, moving or looking for a file. **When you add, rename or remove a top-level directory** (under the repo root, `lib/`, `test/` or `schemas/`), update its bullet there in the same commit — CI doesn't check it, only humans catch drift. If a directory fits no group, add a group rather than dropping the entry.

Rules the map carries that apply everywhere:

- **A plugin never belongs in `lib/` root**: it goes in the directory for what it acts on (asset set → `lib/output/`, module graph → `lib/optimize/`, entry → `lib/entry/`); if none fits, add a directory, with its bullet in the map, in the same commit.
- **Documentation lives in `docs/`**, never under `lib/`, which is published (`package.json` `files`); docs about `test/` or `tooling/` may sit in those directories.
- **Edit an option's declaration, never its schema**: JSDoc typedefs in `lib/` for a plugin, `declarations/WebpackOptions.ts` for the configuration; `generate-schemas.js` derives `schemas/**`.
- **Git submodules** live under `test/external/`, fetched on demand and always `--depth 1` (`wpt` alone is ~161k files); each is described in [TESTING_DOCS.md](TESTING_DOCS.md#external-test-corpora).

**Adding or renaming a webpack option** touches every layer, in order — skipping one silently breaks the option:

1. **Type** — `declarations/WebpackOptions.ts` for a configuration option, or the JSDoc typedefs in the `lib/` module reading it for a plugin's, which `yarn fix:special` turns into the schema.
2. **Defaults** — `lib/config/defaults.js`.
3. **Normalization** — `lib/config/normalization.js`.
4. **Implementation** — where the option is consumed.
5. **Generated output and snapshots** — run `yarn fix:special` (so `lib/` can reference the new types), then update the snapshots the option's _name_ leaks into, which no `configCases/` pattern matches:
   - `test/__snapshots__/Cli.basictest.js.snap` — CLI flags derive from the schema; every property adds one.
   - `test/configCases/ecmaVersion/browserslist*/webpack.config.js` — **inline** snapshots of the resolved `output.environment`: one entry across nine config files.
   - `test/unitCases/__snapshots__/target-browserslist.unittest.js.snap` — same, per browserslist query.
   - `test/unitCases/Defaults.unittest.js` — **inline** snapshots of the whole resolved config (base defaults plus once per browserslist fixture), so an `output.environment` property adds a line to each. Runs in the `unit` flag, which no `configCases` or `basic` run reaches.
   - `test/unitCases/Validation.unittest.js` — **inline** snapshots quote the "these properties are valid" list, so a new `module.rules` property changes one. Runs in the `unit` matrix, not `basic`.

Consider updating `examples/` and running `yarn build:examples` after adding or modifying options.

> [!REQUIRED] > **Never hand-edit what `yarn fix:special` generates**, even when it also reformats files you didn't touch. That churn means your toolchain resolved differently from CI's: commit only your own hunks, then **verify them against the generator** (re-run and diff) — never hand-write what you think it would emit. A hand-written JSDoc block missing the `@since` line the schema's `added` keyword produces, or a `types.d.ts` member the JSDoc implies, fails `lint` with only `… need to be updated`.

**A nested minifier needs the outer one's options.** `lib/html/htmlMinify.js` runs the CSS minifier over inline `<style>` and every `style=""`, so `output.environment` must reach both, or a `.css` asset and the same declaration inline disagree about what the target reads. Any future HTML-minifies-JS hook has the same obligation.

**Documentation keywords are written as JSDoc tags**, and the schema states what they say:

- `@since <version>` → `"added"`: the first webpack version shipping the option. An unreleased option gets the upcoming version (`package.json` version with pending changesets applied — on `5.108.x` with minor changesets pending, `@since 5.109.0`).
- `@experimental` → `"experimental"`, for `experiments` options or others subject to breaking changes.

They are documentation only (stripped from precompiled validators). A pure `$ref` property can't carry them — annotate the referenced definition. A keyword cannot sit after a `@property` line either, where a stray tag ends the property list: a property carrying one is a named typedef tagged `@inline`, whose body the schema puts back where the reference was.

**What a schema may say is the lint rule's job, not the generator's.** `webpack/valid-schema` rejects extra keys beside a `$ref`, any `minLength` but `1`, and an `enum` holding non-primitives (the validator emits no other length check and compares nothing else); `yarn lint:code` reports them at the key, and the generator assumes they hold.

**`normalization.js`** canonicalizes the user's config shape (shorthand → full form); **`defaults.js`** fills values (often mode/target-dependent). Edit whichever matches.

**New dependency type:** pair the `Dependency` subclass with a `DependencyTemplate` (emits the code), register the class with `makeSerializable(...)`, and wire the template into `compilation.dependencyTemplates`. A plugin outside the repo reaches all three through `compiler.webpack` — `Dependency`, `template.DependencyTemplate`, `module.NullFactory` and `util.makeSerializable` are public for it, and `makeSerializable` registers globally, so build the class once rather than per `apply`.

**Finding a hook:** hooks live on their owning class — compiler-wide in `lib/Compiler.js`, per-compilation in `lib/Compilation.js`; tap with a unique plugin-name string.

**New runtime requirement:** declare it in `lib/runtime/RuntimeGlobals.js`, emit it with a `RuntimeModule` subclass, and inject it by tapping `runtimeRequirementInTree`/`additionalTreeRuntimeRequirements` on `compilation.hooks` (`…InModule` variants for per-module needs).

### Moving a file out of `lib/` root

> [!REQUIRED]

**Run `yarn find-deep-imports:check` on every move, before committing.** A path leaving `lib/` root breaks any published package importing it; `tooling/deep-webpack-imports.json` records which. `--write` refreshes it off the registry; `--check` needs no network and is what CI runs. Its `removed` map (paths no webpack 5 build can reach) is disjoint from the imports — `--write` skips a path `removed` names.

**A re-export is owed only to a webpack-5 package importing the path unconditionally.** Read the importer's tarball, not its download count: if its `peerDependencies`/`dependencies` name webpack 5 and it requires the path at top level, add a `// TODO in the next major release: remove` re-export at the old path. If it is webpack 4 only (imports something webpack 5 deleted) or probes the path inside a `try` to detect webpack 4, add a `removed` entry with that reason instead — a re-export would send it down the wrong branch.

**Six things carry a path, only the first obvious.** Rewrite all, then confirm by regenerating, not reading:

1. `require("…")` / `require.resolve("…")`, including template literals and a string in a ternary branch lines away from its call.
2. `@import … from "…"` in JSDoc.
3. `@typedef {import("…")}` — a different form; missing it silently drops the type from the public surface.
4. `tsType` in `schemas/**/*.json` — fails loudly in `fix:special` or silently degrades a public type to `any`.
5. `makeSerializable(Class, "webpack/lib/…")` — the request moves with the class, and every request it was written under before goes in an array after the new one (current first), or pre-move cache packs stop loading. Reach for `registerLegacyRequest` only where the array cannot say it: a class registered with `register` and a serializer of its own, or an old request carrying a different `name`.
6. A path in a config or generator outside `lib/` — the input list in `tooling/generate-runtime-code.js`, an `ignores` entry in `eslint.config.mjs`. Both silently stop matching; the second fails as style errors in a file nobody edited.

`yarn fix:special` leaving `types.d.ts` byte-identical confirms 3 and 4; `ConfigCacheTestCases` reporting no `Pack got invalid` line confirms 5; nothing static catches 1 — only building `lib/index.js` does.

This applies equally to moves **between** `lib/` directories, where 6 is what has actually gone wrong (`lib/util/semver.js` was named in both files above).

**Update [docs/architecture.md](docs/architecture.md) in the same commit**, and grep this guide and `docs/` for the old path — prose elsewhere names files too.

### Diagnostics and hints

> [!REQUIRED]

**Error and warning classes live in `lib/errors/`**, whatever raises them; the raising plugin stays where it belongs.

A hint reuses existing reporting: `SizeLimitsPlugin` and `DuplicatePackagesPlugin` both end in `hints === "error" ? compilation.errors : compilation.warnings`; hardcoding one list makes a hint impossible to escalate. Prefer an option saying _whether_ to run the check and leave severity to `performance.hints`.

**`makeSerializable` follows from where a diagnostic is created.** Anything reachable from a module (`ModuleError`, `ModuleWarning`, `ModuleBuildError`) is serialized with the module graph and must register. One built after seal and pushed onto `compilation.warnings` never enters the pack, which is why the size-limit and duplicate-package warnings register nothing. A wrong guess is silent except for `Pack got invalid because of write to:` under `ConfigCacheTestCases`, so cover a new diagnostic there.

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

**Behavior across rebuilds is a `watchCases/` case, never a unit test calling `compiler.run` in a loop** — `output.clean`, HMR update files, caches, anything one build leaves for the next. Each numbered step directory is one rebuild; its tests read `WATCH_STEP` and `STATS_JSON`, and the config can read the step from `test/helpers/currentWatchStep`. What the output can't show (which files a plugin touched) is recorded by a plugin in the config, which pushes a `compilation.errors` entry when it differs (`watchCases/clean/removed-assets`). A step needing time to pass waits in its own `it` with a longer timeout (`watchCases/clean/hot-update-slow-rebuild`).

**Snapshot printed code; assert everything else.** When the thing tested _is_ generated output — bundles, minified CSS/HTML, serialized ASTs, stats text — use `toMatchSnapshot()`, not `expect(...).toBe(...)` on fragments (which pins one substring and ignores every other byte). For behavior, invariants, equivalences and error paths use explicit `expect`s; a snapshot there only records what happened to be true. Never snapshot a value some machine can't produce (a snapshot skipped without an optional browser or native binary is reported obsolete and fails the run there), and keep control characters out of snapshots (one NUL makes git treat the file as binary and hide its diff).

Run targeted tests only — `yarn test:base --testPathPatterns="<pattern>"` or `-t "<name>"` — covering the touched code, and leave broad suites to CI. Never bare `yarn jest`/`npx jest` (see [Commands](#commands)); no `yarn test` unless asked; eyeball the diff before `yarn test:base -u`.

> [!REQUIRED] > **Two kinds of change widen the blast radius.** Touching `schemas/**`, `lib/config/**`, or anything `yarn fix:special` generates moves the whole option surface. Still don't sweep suites locally: push, let CI sweep, and [read the failing job's log](#read-ci-rather-than-re-running-it). Locally run only the touched `configCases/`, `yarn lint:code` and `yarn fix:special` (whose output says whether a generated file is stale). `lint`, `basic` and `unit` gate the `integration` matrix in `.github/workflows/test.yml` (`integration: needs: [lint, basic, unit]`), so a red one — `lint` included — stops every integration upload, and coverage then computes patch coverage from whichever cheap suite did report: it reads like a coverage problem but isn't.

> [!REQUIRED] > **Run every stage of `lint` before every push — not a chosen few, not only your files.** `yarn lint:types` plus `npx eslint <files>` is **not** "lint passed": it skips `lint:special` (fails on stale generated files) and `lint:spellcheck` (reads every Markdown file). `yarn fix` isn't it either — it regenerates and formats but doesn't type check or spellcheck — so **run `yarn lint` after it** (or all nine stages by hand if an early one trips on sandbox drift). Read each stage's output whole: piping through `tail`/`grep` is how a finding just above the summary reaches CI instead of you.
>
> **A generated file is stale as soon as any JSDoc it copies changes — prose included.** `types.d.ts` carries the comment above `process()`, not just its signature; a reworded comment, or a signature edited without its doc paragraph, fails `lint` with the same `types.d.ts need to be updated` a missing member gives. After splicing your hunks, diff your file against the generator's whole output for that symbol's **region**, not just the lines you meant to change.

`yarn lint` is an `&&` chain, so the first stage tripping on sandbox drift hides the rest. If `lint:special` reports declarations "need to be updated" that `main` reports too, run the rest by hand: `lint:types`, `lint:types-test`, `lint:types-benchmark`, `lint:types-module-test`, `lint:types-hot`, `fmt:check`, `lint:spellcheck`. `lint:types-test` catches `tsc` errors in `test/`; skipping it is how a red `lint` survives "lint passed locally".

A local failure is yours only if it doesn't reproduce on `main` — check in a worktree (`git worktree add <dir> origin/main`) first. Sandboxes routinely fail `Cli createColors`, `profiling-plugin` and the `many-replacements` cases for environment reasons, and the generated-declaration check flags files CI accepts. **Hard rule — no broad local sweeps**: never run the spec-conformance suites (`test:test262` alone takes tens of minutes, `test:html5lib`, `test:css-parsing`) or the full `test:integration` matrix as routine local verification — CI runs them on every push; locally, run the `configCases/` relevant to your change. Broad local sweeps cost minutes and, on a busy machine, manufacture timeouts that look like regressions. Narrow the pattern until a run takes seconds, and:

- **Never read pass/fail through a pipe** — `yarn test:base … | grep …` discards jest's exit code. Check the exit status or read the `Tests:` line.
- **Never attribute a failure without a base run** — re-run that exact case on unmodified files first; most surprises are pre-existing or contention flakes.

### Read CI rather than re-running it

> [!REQUIRED]

**When CI is red, read its log instead of reproducing the whole job locally** — rediscovering one line by re-running `yarn lint` or a suite wastes minutes and tokens. Filter the run to failing jobs (`gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion=="failure")'`, or `list_workflow_jobs`), read that job's log (`gh run view --job <id> --log-failed`, or `get_job_logs` with `return_content`, asking for enough lines to clear the trailing `Post job cleanup`), then reproduce **only the named case**: `yarn test:base --testPathPatterns="<file>"`, `yarn test:basic --testNamePattern="<category> <case>"`, or `npx eslint <file>`.

Traps: a step is not a job — `Run yarn lint` sits inside the `lint` job, and a step's id fetches the wrong log, so select the object with a `steps` array. And `yarn lint` stops at its first failing stage, so a CI failure in `lint:code` says nothing about later stages — just as a local `lint:special` complaint `main` also makes says nothing about CI.

### Verifying a performance or memory change

> [!REQUIRED]

Read [docs/performance.md](docs/performance.md) before claiming or measuring a performance, memory or emitted-size change. In short: prefer counting over CPU-profile attribution over retained heap over wall timing, inside a real build, never a micro-benchmark; for size, gzip decides and a re-encoding must show a compressed win; `readWord`, `readString` and `finishToken` in `lib/javascript/syntax-parser.js` sit just under V8's inlining budget — check their bytecode size before and after touching them.

**Run one integration case** by name (`<category> <case-name>`, e.g. `css basic`):

```sh
yarn test:basic --testPathPatterns="ConfigTestCases" --testNamePattern="<category> <case>"
```

Swap in `StatsTestCases`, `HotTestCases`, `WatchTestCases`, … (full matrix in [TESTING_DOCS.md](TESTING_DOCS.md)). The `test262`, `html5lib`, `syntax-equivalence` and `css-parsing` suites need submodules — run `git submodule update --init --depth 1 test/external/test262-cases test/external/html5lib-tests test/external/wpt test/external/css-parsing-tests` first, or they fail confusingly.

**A `configCases/` case** is a mini project: `index.js` (assertions; a throw fails) plus `webpack.config.js`; the emitted bundle is executed, so it must run. Optional: `errors.js` / `warnings.js` export matcher arrays for expected diagnostics (otherwise any error/warning fails the case); `test.filter.js` returns `false` to skip (e.g. by Node version when the fixture itself needs newer syntax — see [Target the Node baseline](#target-the-node-baseline)); `test.config.js` customizes the run (e.g. `findBundle`).

**Cover every line you add or change** — a commit must not lower coverage (CI enforces patch coverage, target 90%+). Every new branch, fast path and fallback needs a test: `configCases/` when a real build reaches it, a focused `*.unittest.js` only when a config case can't reasonably drive it or adds nothing (e.g. tokenizer cold-path fallbacks, where fast and delegated branches each still need exercising). Check with `yarn cover:unit` or the PR's "patch" report until no changed line is missing.

**Don't lower type coverage either.** CI collects it (`yarn types:cover:report`) and reports the delta on the PR. Prefer real types over `EXPECTED_ANY` ([Type annotations](#type-annotations)), and run `yarn types:cover` if you widened any annotation.

## Git & PR rules

### Adding a Changeset

Every user-facing change needs one:

```bash
# Create .changeset/<NNN>-<descriptive-name>.md with this format:
---
"webpack": patch    # or minor / major
---

Description of the change.
```

`patch` = bug fix, `minor` = feature, `major` = breaking. No `fix:`/`feat:` prefix.

**Description**: one imperative sentence, ≤ 80 characters, **capitalized**, **trailing period** ("Fix split-chunks cache key collision."). Changesets go into `CHANGELOG.md` verbatim; rationale belongs in the PR body.

**One changeset per PR** — fold related changes into one entry (one sentence, highest bump level; length may stretch slightly); separate files only for genuinely unrelated changes. **Union same-topic entries**: first scan `.changeset/` for a pending entry on the same area (option, parser, subsystem, bug family) and fold into it — seven "Speed up JavaScript parsing." lines are one entry.

**Filename sets order.** Entries render grouped by bump level (Major → Minor → Patch), then in sorted filename order. Name each `NNN-<description>.md` with a zero-padded prefix (`010-`, `020-`, …; lowest sorts first), ordered by importance: user-facing features, correctness fixes, performance, then internal/build/chore. Leave gaps and slot yours relative to existing files.

### Branch name

> [!REQUIRED]

Format `<type>/<short-description>` (e.g. `fix/split-chunks-cache-key`, `feat/css-modules-named-exports`), where `<type>` is one of `fix`, `feat`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `style`, `revert`, `docs` and matches the PR body's "What kind of change…" answer.

**Pick `<type>` from the diff** — never guess or reuse a previous task's. Inspect the staged changes and take the first match describing their _primary intent_:

1. `revert` — reverts a previous commit.
2. `fix` — corrects incorrect runtime behavior; normally with a regression test.
3. `feat` — new user-facing capability or option (touches `schemas/`, `lib/config/`, or adds public API).
4. `perf` — faster builds or less memory, behavior unchanged.
5. `refactor` — restructures `lib/` without behavior change or features.
6. `test` — only `test/`.
7. `docs` — only documentation (`*.md`, example READMEs, JSDoc-only prose).
8. `build` — build system or dependencies (`package.json`, `tooling/`, generators).
9. `ci` — only `.github/`.
10. `style` — formatting only.
11. `chore` — anything else.

Classify mixed changes by primary purpose (a fix with a test is `fix`; a feature with docs is `feat`).

**PR/commit titles**: conventional-commit `type(scope): subject`, scope optional (`perf(css): …`, `feat(caching): …`, `fix: …`), `type` matching the branch prefix.

Never prefix with `claude/`, `claude-code/`, `bot/`, `ai/` or any tool/agent identifier. If the harness pre-created a branch with any other prefix (an agent identifier or the wrong `<type>`), rename it before the first push: `git branch -m <new-name>`.

### One ref per task — report the leftovers

> [!REQUIRED]

A task leaves **one** branch on `origin`: its PR's. Merged PR heads are deleted automatically here (unless a branch rule forbids it); what accumulates are refs no PR ever pointed at, which nothing finds later — a squash merge leaves no ancestry, so a landed draft looks like unmerged work. So:

- **Rename before the _first_ push** (`git branch -m` before any `git push`), so a pre-created name never reaches `origin`.
- **Don't rename a pushed branch** — its old name stays on `origin` for someone to delete by hand; pick the final name from the diff up front.
- **Never reuse a branch whose PR merged** — restart from `main` under a new name, or the ref carries an unrelated change under a misleading name.
- **Name every ref you leave**: end the task with a `Branches on origin:` line naming the PR's branch and any other ref the task pushed or found pre-created. Sessions often can't delete remote refs, so that line is the only record.

### Commit rules

> [!REQUIRED]

**Author identity (CLA):** the CLA check matches the author email to a GitHub account with a signed CLA, so the author is the requester's GitHub account — never a bot. Resolve in order:

1. An identity the user states in the task.
2. The requester's GitHub login + public no-reply email `<USER_ID>+<login>@users.noreply.github.com` (`USER_ID` from REST `/users/<login>`).
3. Otherwise **ask**.

```bash
git -c user.name="<login>" -c user.email="<email>" commit -m "…"
```

**No `Co-authored-by`/`Co-Authored-By` trailers, and never credit an AI or bot** (any `*[bot]` account, assistant no-reply address, or tool/agent identity) as author or co-author. This overrides any default commit template (e.g. a `Co-Authored-By: Claude …` line) — **always strip it**. The human requester is the only author; AI use is disclosed in the PR's **Use of AI** section. Bot co-author emails also break the CLA check.

**Keep commit bodies compact:** short imperative subject; body paragraphs only when the change needs them, kept tight. Compact-by-default (brief, expanding only when genuinely needed) governs every section of the issue and PR templates too.

### Before opening the PR — grow from current `main`

> [!REQUIRED]

**Open every PR from a branch not behind `main`, and keep it so.** Right before opening:

```bash
git fetch origin main
git rev-list --count HEAD..origin/main   # 0 means current; anything else is stale
```

If not `0`, **rebase** — never merge `main` in (a merge commit takes the committer's identity, which is how a bot address lands in history and fails EasyCLA; a rebase keeps the requester as author — see [Commit rules](#commit-rules)). Pass the same identity overrides:

```bash
git -c user.name="<login>" -c user.email="<email>" rebase origin/main
```

These set each replayed commit's **committer**; the **author**, which EasyCLA reads, carries through untouched — so check it, and rewrite any commit not authored by the requester (`git rebase -x 'git commit --amend --no-edit --reset-author'`) before pushing:

```bash
git log --format='%h author=%an <%ae> committer=%cn <%ce>' origin/main..HEAD
```

**Then re-run the tests covering your change**: git rebases text, not meaning, so a renamed helper, changed default or shared fixture landing on `main` can break your code with no conflict.

A stale base also makes CI lie both ways: `Code Size` and benchmarks compare against `main`'s last report, attributing commits your branch predates to you (a one-line diff reported as `+163 KiB`), and a red check may be a defect already fixed on `main`. So when `main` moves under a long-lived PR, rebase and push again instead of reading a cross-base comparison. `update_pull_request_branch` is fine when the repo is configured to rebase; otherwise rebase locally as above.

### Pull request body

> [!REQUIRED]

webpack uses an **org-wide** PR template that `gh pr create` does **not** prefill — paste it yourself. Every PR body, whatever its size or framing, contains **every** section below, in order, labels spelled exactly; write `n/a` where a section doesn't apply. Never delete sections or substitute another template (e.g. `## Summary` / `## Test plan`). Titles are plain text — raw `<`, `>`, never HTML entities.

**Keep answers short — ideally one sentence, at most two or three**: the body orients reviewers rather than recapping the investigation, and a reviewer should read the whole body in well under 30 seconds. Where another section of this guide requires rationale in the PR body, give enough to satisfy it (concise multi-paragraph is fine). No bench tables, code blocks, or walkthroughs of iterations/reverts; put extra background in a linked issue/discussion, the relevant inline review thread, or the squash-merge commit body.

Mistakes that block PRs: `## Summary` headings instead of `**Summary**` bold labels; omitting **Use of AI** (mandatory per the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md)); omitting or mis-answering **What kind of change…** (must match the branch prefix); dropping the HTML comment hints or leaving sections blank instead of `n/a`.

Paste this body (without the fence lines):

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

Answers (one sentence each is the target, two or three the maximum):

- **Summary** — motivation and the problem solved; link the issue. Use `Closes #…` / `Fixes #…` when the PR resolves it, `Refs #…` only for issues it merely relates to.
- **What kind of change…** — one of fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs.
- **Did you add tests…** — yes/no + which files.
- **Breaking change** — yes/no + migration path if yes.
- **Documentation** — doc updates, or `n/a`.
- **Use of AI** — that AI was used and how; omitting or misrepresenting it can get the PR closed per the AI policy.

### After push — verify PR body

After every `git push` of a new branch, check whether a PR was auto-created (webpack has this webhook); if so, `update_pull_request` to install the full template — the auto-created body never matches.

### Watching a PR, and updating its branch

> [!REQUIRED]

**Subscribe to every PR you open** (`subscribe_pr_activity`) as the last step of opening it — not a question for the requester. You own it until it lands, and [every check ends green](#after-opening-the-pr--every-check-ends-green) and [the automated reviews](#after-opening-the-pr--wait-for-the-automated-reviews) need the session awake. Stay subscribed until merged or closed, or the requester says stop.

Don't, unasked, **rebase or merge the base branch into the PR** — maintainers usually land PRs through their own pipeline. Merely being behind `main` isn't a defect; doing it unasked rewrites history their pipeline was about to handle, restarts every check, and can drop an approval. Do it when the requester asks or the PR is reported genuinely un-mergeable, and say which applies before pushing. Pushing your own commits to your own branch is free; anything changing how the PR gets landed needs asking.

### Writing on GitHub — ask first

> [!REQUIRED]

**Never post to GitHub on your own initiative.** Pushing to your own branch is fine; publishing text others read is not — PR comments, review replies, issue comments, PR body edits after opening (except installing the template over an auto-created body, [below](#after-push--verify-pr-body)), and every reply to any bot.

Reading is never banned. Bot noise may be skipped: status checks, a benchmark that swings on re-run, a coverage report still waiting on uploads, changeset/preview echoes — replying to those costs maintainers more attention than the finding.

Anything naming a possible bug, regression or improvement must be investigated, whoever raised it — being a bot is no reason to dismiss it; judge the claim. Reproduce it, then fix and push (no permission needed) or, if you believe it's wrong, bring it **into the session**: what you found, the reply you'd send, and let the requester decide whether to post. Never leave such a finding unanswered.

### After opening the PR — every check ends green

> [!REQUIRED]

**The target is the whole run green — every check.** A red check is never something to explain, defer or wait out; no wake on one ends without a pushed commit or a reply naming the blocker, and "that one isn't important" is not your call.

- **A check that failed once is re-run before it's believed.** Infrastructure fails (runner dies, network fetch times out, an engine crashes on its own bug — the tell is a job reporting every test passing then dying anyway). Re-run the failing job; **if the re-run fails the same way, ignore it and move on** — no more re-runs, no rewriting working code around it, no holding the PR.
- **Coverage is read only once the uploading suites finish** (below).

Neither excuses a check you can run yourself: **one that reproduces locally is never re-run and shrugged at** — it's your failure until a run on unmodified `main` proves otherwise. Fix and push.

Read the failing job's log ([how](#read-ci-rather-than-re-running-it)), reproduce **only the named case**, fix the cause, re-run that case, then push — never re-run the whole job to find what the log already says. Two recurring failures:

- **cspell** rejects a word — reword (the codebase is American English, and [Naming](#naming) forbids abbreviations) or add a genuine term to `cspell.json`.
- **A snapshot lives in two suites** — `ConfigTestCases` and `ConfigCacheTestCases` both snapshot `configCases/`, and `--testPathPatterns=ConfigTestCases` doesn't match the latter. Use `yarn test:basic --testNamePattern="<case>" -u` (no path filter): the name filter covers that case in both suites, no full `test:basic` needed.

A measuring report (performance, memory, a preview build) is investigated and answered with evidence, not a reflex commit. Reproduce the claim first ([how](#verifying-a-performance-or-memory-change)); a comparison against a base that never ran, across different runner environments, or with a different set of co-running cases is an artifact and usually says so. Reporting an artifact as one is a green outcome; leaving it unexamined is not. Replying to the bot needs permission ([Writing on GitHub](#writing-on-github--ask-first)).

**Don't read, chase or act on coverage until every suite uploading it has finished.** Each suite uploads its flag on completion and the service recomputes after each, so until the last lands the number is a partial sum — a large drop, a comment rewritten in place with changing percentages — meaning "not all suites reported", not "coverage lost". The report names how many uploads the head still lacks; **read that line before the percentage**, and treat non-zero as "not ready". **A red coverage check while coverage changed is normal mid-run**, not a failure.

**Wait for those suites, not the whole run.** Uploaders are the jobs calling the coverage action in `.github/workflows/test.yml` — today `unit`, `integration` (sharded, most uploads, gated behind `lint`, `basic`, `unit`), `test262`, `syntax-equivalence (chrome)` and the `parser (css)` / `parser (html)` legs; the other two browsers and `parser (js)` run uninstrumented. Read the workflow if they've moved. Benchmarks, code scanning, dependency review, preview publishing, type-coverage and the changeset echo never upload and can't move the number, so a coverage gap is safe to fix while they run or are red.

Once the uploaders are in, read the report; only then is a genuine patch gap worth a test. Chasing an intermediate number costs pointless commits and tempts `lib/` changes that exist only to move a percentage.

### After opening the PR — wait for the automated reviews

> [!REQUIRED]

Every webpack PR is reviewed automatically on the initial commit and every push, by whichever automated reviewers the repo enables. Always wait for them and address every comment; judge a bot's finding on the claim and reproduce it before deciding.

1. After `create_pull_request`, `subscribe_pr_activity` ([see above](#watching-a-pr-and-updating-its-branch)); reviews then wake the session — do **not** poll.
2. For each review comment: if correct, push a fix in a new commit — **including for bugs your own PR introduced**, the common case. If wrong, draft a reply and ask the requester before posting ([Writing on GitHub](#writing-on-github--ask-first)) — never ignore it silently.
3. Every push re-runs the reviewers; repeat step 2 until each one's latest review has zero outstanding threads.
4. `unsubscribe_pr_activity` only once every comment is handled and CI is green, or when the user says stop.

### While watching — report only what needs a decision

> [!REQUIRED]

**A wake that changes nothing ends with no message.** Report — in a line or two — only when:

- a review comment (human or bot, judged on the claim) needs an action or decision;
- a check failed for this PR's reason, with the fix pushed or what blocks it;
- a measuring report is **final** and moved: code size (read gzip), coverage once every uploader reported, a benchmark whose output doesn't disclaim itself;
- the PR merged or closed, or the requester must choose something.

**Never narrate the rest** — intermediate coverage recomputes, partial-upload percentages, bot echoes (changeset, preview publish, "review in progress"), a check turning green, lists of job states. That buries the one wake that matters.

Silence isn't skipping: read every event and investigate what it names; this governs only what reaches the requester. A finding judged an artifact is still reported once, with evidence ([see above](#after-opening-the-pr--every-check-ends-green)).

## Do not touch

> [!REQUIRED]

Produced by `yarn fix:special` — never edit by hand:

- `types.d.ts` — from JSDoc + schemas.
- `schemas/**/*.check.{js,d.ts}` — precompiled schema validators.
- Generated runtime code under `lib/` (`tooling/generate-runtime-code.js`).
- `lib/css/data.js` — every table the CSS minifier looks names up in, plus the arithmetic its math-function descriptors bind to: from `mdn-data` + `color-name` (box shorthands, color-argument and math functions, named colors) and the generator's `SUPPLEMENT` of spec-prose tables and math primitives, by `tooling/generate-css-data.js` — which also holds the value-definition-syntax parser those grammars are read with, and runs generation only as the entry point so its tests can require it.
- `lib/html/data.js` — every table the HTML parser and minifier look names up in: reflected-attribute tables from webref's HTML IDL (`@webref/idl`, `@webref/elements`) plus the generator's `SUPPLEMENT` and `PARSER_TABLES` of §13.2 tree-construction vocabulary, by `tooling/generate-html-data.js` — which also emits the `// #region html entities` block in `lib/html/syntax-parser.js` from the vendored `tooling/html-entities.json` (WHATWG's named character references).
- `lib/javascript/data.js` — the JS parser's Unicode tables in one module: run-length identifier ranges the tokenizer decodes at its first non-ASCII code point, and per-edition `\p{...}` property names (reached only for a pattern the engine rejected), by `tooling/generate-js-data.js`, which reads both from the pinned acorn devDependency — bumping it moves them.

A `syntax-parser.js` or `syntax-printer.js` is algorithm only — a new lookup table belongs in the matching generator. Generator-written regions such as `// #region html entities` are the exception; `syntax.js` is a facade, neither.

**In the generator, derive — don't type out.** Read tables from published datasets (`mdn-data`, `color-name`, `@webref/idl`) whenever derivable, _including by analyzing a grammar rather than listing names_: the value-definition syntax says which properties take an `<integer>`, so that set is computed. An existing `SUPPLEMENT` table counts as a source too — cosine at each eighth turn is sine two eighths along, and each inverse trig table is its forward one read back.

**Per-construct behavior is a table too.** Where the minifier differs per name (each math function; next, properties or at-rules), the per-name part is a descriptor in the generator and the shared part an engine in `syntax-printer.js` keyed by it. `MATH_FUNCTION_FOLD` is the example: it says how each function's arguments are read, which arithmetic runs and what unit results carry, so the printer implements none and names no function. The arithmetic is emitted alongside and bound by reference, not name, so an undefined name fails generation instead of folding nothing. A new function is one line; one whose arithmetic exists needs nothing else. A test must drive every descriptor (one input per entry) so a wrong-but-existing binding fails instead of silently declining. Hand-listing names into `SUPPLEMENT` is the last resort, each entry stating why it can't be derived (spec prose, an equivalence between spellings, a judgement no dataset states) — hand lists go stale unnoticed when specs move; derived ones turn a spec change into a reviewable diff.

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

Runtime-emitting code — chunk loading (`lib/web/` JSONP, `lib/esm/`, `lib/node/`, `lib/webworker/`), prefetch/preload/resource hints, library and externals presets — is **per-target**: browsers/JSONP, ESM `output.module`, `node`, `webworker`, `deno`, `electron`, `bun`, and the **universal** `target: ["web", "node"]` neutral-platform path each have their own module or wiring — changing one and forgetting the others is the easy mistake. Apply a change to **every** affected target, with an integration case per target (typically `target: "web"`, `output.module`, `target: ["web", "node"]`; plus `node`/`webworker`/`bun`/`deno`/`electron` when in scope). The universal runtime guards browser APIs behind `typeof document === "undefined"` so its bundles run in Node without a DOM, and its config case must gate DOM assertions on `typeof document !== "undefined"` (see `configCases/target/universal-prefetch-preload`).

**Then check wire cost.** `yarn test:size` (and the `Code Size` CI job, which compares against `main`'s last report and comments on the PR) builds every `configCases/` case and reports **one row per changed asset**: raw before → after plus gzip/brotli/zstd. **It is information, never a verdict** — it doesn't fail, and moving numbers isn't a defect. It answers:

- **Which files changed, by how much?** The per-asset table is the headline; no suite-wide total is reported (nothing actionable). Raw is what the generator wrote, compressed is what users download — read both; a raw saving with no gzip saving mostly moved entropy. [gzip decides](docs/performance.md).
- **Which way?** 🔴 ↑ grew, 🟢 ↓ shrank.
- **Change or new?** Assets both runs emit are changes; ones only this run emits are new files, not deltas. They're in separate tables — changed first and unfolded, new/deleted folded, each with its own row budget — and separate verdict rows (`Changed …` vs `New` / `Deleted`), so new test cases' bundles don't bury real changes.
- **webpack or the case?** A bundle is a function of its case's source, so adding assertions to a `configCases/` case grows its bundle without touching `lib/`. The report measures each case's module source and splits changed assets: `Changed, test untouched` is webpack's doing and the row size claims are read from; `Changed, test edited` has a `Test edit` column with bytes of source gained — a bundle growing less than its case isn't a regression. Cite the first row, never suite-wide numbers, when a PR touches both `lib/` and tests.
- **Did a runtime gain or lose a runtime module?** A second table counts runtime modules per runtime and names those that came or went, split the same way (a runtime a new case brought gained nothing). Deliberately no per-runtime-module bytes (not what anyone downloads); the count catches a runtime module added for one target and forgotten for another.

Read the "emitted nothing" note first: a case whose build now errors contributes no bytes, which otherwise looks like an improvement. When the numbers moved, say what it reported in the PR.

### Lint covers every file, docs included

`lint` runs Prettier (`fmt:check`) and cspell (`lint:spellcheck`) over the **whole repo**, Markdown and this guide included. Run `yarn fix` before pushing even a docs change: an unaligned Markdown table or unknown word fails `lint` alone. Add a genuine new word to `words` in `cspell.json` (or reword); Prettier reformats Markdown tables, so hand-written columns must match its output.

### The persistent cache has to keep working

> [!REQUIRED]

Persistent caching is a shipped feature, not a test mode. `ConfigCacheTestCases` re-runs **every** `configCases/` case with `cache.type: "filesystem"` and fails it if the second or third run writes to the pack:

```
Pack got invalid because of write to: <identifier>
```

`<identifier>` was **not** restored but rebuilt — on a user's machine, work redone every incremental build. **Treat it as a defect and find the cause**; don't silence it.

The cache serializes the module graph, so every new serializable class (a `Module`, `Dependency` or error subclass, a cached value, …) must call `makeSerializable(...)` (~140 files do), and `yarn fix:serializables` regenerates `internalSerializables`. Forgetting is the most common cause, silent apart from the line above. The suite runs with `infrastructureLogging.debug`, so the log usually names the cause a few lines earlier:

- `No serializer registered for <Class>` — the class never called `makeSerializable(...)`.
- `Skipped not serializable cache item '<key>'` — something reachable from the value can't be written.
- `Restoring failed for <identifier> from pack: <err>` — written, but deserialization threw. It re-enters the constructor with **no arguments**, so a constructor dereferencing a parameter (`err.message`) must guard (`err ? err.message : ""`).
- Nothing — the identifier isn't stable between runs, or the module reports it needs rebuilding.

**Never silence it with `test.filter.js`** (`module.exports = (config) => !config.cache`): that drops the case from the cache suite entirely, including the parts that worked. A new case must pass both suites. (Gating a fixture needing post-baseline syntax is different and fine — see [Target the Node baseline](#target-the-node-baseline).)

The one expected write webpack ships is a module carrying a **build error**: `NormalModule.needBuild` returns true while `this.error` is set, since errors are retried every build. A case whose subject is an error therefore invalidates the pack by design and says so with an `infrastructure-log.js` returning `[/Pack got invalid because of write to/]` when `cache.type === "filesystem"` (~20 cases do). That's the only expectation needing no justification; any other must carry, next to it, why it isn't a bug — "it is noise here" isn't a reason.

### Performance and memory

Users measure webpack by build time and peak heap. Much of `lib/` sits on per-module hot paths (sometimes per module × runtime, or per chunk × module), so constant factors compound: weigh time and memory in every change, bug fixes and refactors included. Less allocation, smaller `Map`/`Set` footprints and fewer closures retained on hot paths are wins. For any per-`Compilation` state, ask whether it can be released after seal/emit so large structures aren't retained longer than needed (see #15521). Sanity-check perf changes with `FILTER="<case-name>" yarn benchmark` before CI's benchmarks flag them.

### Keep instance shapes stable

Initialize **every** instance field in the constructor — `undefined`/`null` for those first assigned later. A first assignment outside the constructor forces a V8 hidden-class (Shape) transition, splitting instances across shapes: inline caches go polymorphic/megamorphic (a hot read can cost ~2× at two shapes, more when megamorphic), and code optimized for the first shape deopts with `wrong map`. Never `delete` a field (dictionary mode); set it to `undefined`. One trailing field gains little, but the rule is uniform so reviewers needn't judge case by case — it's why `Dependency` sets all its `_loc*` slots up front. Deliberate symbol-keyed sparse slots are the documented exception.

Adding a public (non-`_`) field to a class compiled into `types.d.ts` needs `yarn fix:special` — constructor order sets member order in the generated declarations.
