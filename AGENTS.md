# Webpack Development Guide

> Note: CLAUDE.md is a symlink to AGENTS.md. They are the same file.

## Conventions in this guide

A `> [!REQUIRED]` callout placed immediately under a heading marks that whole section as **mandatory and not optional**: follow it exactly, do not paraphrase, do not skip, do not substitute a similar-looking convention from other tooling. Reviewers have repeatedly flagged that REQUIRED sections (especially the [Pull request body](#pull-request-body)) are being skipped or partially filled in — doing so blocks the PR every time. Read each REQUIRED section in full whenever it applies; do not rely on memory or on a previous task's output. Sections without the callout are normal guidance — apply judgement.

## Project overview

webpack is a JavaScript module bundler. It builds a dependency graph from entry modules and emits optimized static assets (chunks) for browsers, Node.js, and other targets. The config API is defined by JSON schemas and everything is wired through a `tapable` plugin/hook architecture.

**Core model:** a `Compiler` drives the build; each run creates a `Compilation` holding the module graph (`Module`s) and output `Chunk`s, which is then `seal`ed and `emit`ted. Plugins expose an `apply(compiler)` method and tap the `tapable` hooks they need.

## Tech stack

- **Language:** JavaScript. `lib/` is **CommonJS only**; types are declared via JSDoc `@typedef` and compiled into `types.d.ts`.
- **Package manager:** **yarn** (not npm).
- **Tests:** jest, run through the `test:base` wrapper (never bare `jest`).
- **Type checking / generation:** TypeScript, driven over the JSDoc annotations.

## Commands

All commands are defined in `package.json` `scripts`.

| Command                                                              | What it does                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `yarn fix`                                                           | `fix:code` (ESLint) + `fix:special` (regenerate types/validators) + `fmt` (Prettier). Prefer as the final step. |
| `yarn fix:special`                                                   | Regenerate `types.d.ts`, declarations, schema validators, and generated runtime code.                           |
| `yarn lint`                                                          | Full lint: ESLint + generated-output checks + every `tsc` project + Prettier + spellcheck (what CI runs).       |
| `yarn tsc`                                                           | TypeScript type check of `lib/` JSDoc (catches type errors in annotations).                                     |
| `yarn validate:changeset`                                            | Validate the pending `.changeset/` files.                                                                       |
| `yarn test:base --testPathPatterns="<pattern>"`                      | Run targeted tests. Also `yarn test:base -t "<name>"`.                                                          |
| `yarn test:unit`                                                     | Run all `*.unittest.js`.                                                                                        |
| `yarn test:integration`                                              | Run the integration suites (`basictest`/`longtest`/`test`).                                                     |
| `yarn test:test262` / `yarn test:html5lib` / `yarn test:css-parsing` | Spec-conformance suites.                                                                                        |
| `yarn test:base -u`                                                  | Update snapshots (eyeball the diff first).                                                                      |
| `yarn test:size`                                                     | Size of the generated code over all `configCases/` (per asset, plus runtime module counts per runtime).         |
| `yarn cover:unit`                                                    | Unit-test coverage.                                                                                             |
| `yarn types:cover`                                                   | Type-coverage report (share of `lib/` that is precisely typed).                                                 |
| `yarn build:examples`                                                | Build the `examples/` (verify after changing options).                                                          |
| `yarn test`                                                          | Full suite — don't run unless asked.                                                                            |

Never invoke `yarn jest`/`npx jest` directly: the required `--experimental-vm-modules` node flag lives only in the `test:base` wrapper, and bare jest crashes ESM/test262 suites. See [TESTING_DOCS.md](TESTING_DOCS.md) for how to run a single case.

**CI must come back green in full** — see [After opening the PR](#after-opening-the-pr--every-check-ends-green); the jobs are defined in `.github/workflows/`, which is the list to read rather than one memorized here. Two of them behave unlike the rest and are worth knowing about: the benchmark job's memory mode is sensitive to fixture size and to which cases share its process, and the Bun job runs under `--smol` and surfaces OOMs the Node suites don't. Watch both when touching hot paths or large test fixtures.

## Architecture

> [!REQUIRED]

The directory listings below are the canonical map of the repository. **Whenever you add, rename, or remove a top-level directory** (under the repo root, under `lib/`, under `test/`, or under `schemas/`) you must update the matching bullet here in the same commit. CI does not check this — drift is only caught by humans, which is why it must be part of the change itself. If a new directory does not fit any existing group, add a new group rather than dropping the entry.

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
- `tooling/` — Repo-internal scripts: build/codegen (runtime/wasm generators, hash-debug tool) invoked by `yarn fix:special`, plus standalone analysis tools such as `compare-css-minifiers.js` / `compare-html-minifiers.js` (`yarn benchmark:css-minifiers`, `yarn benchmark:html-minifiers`). Those two need no arguments and no reading of their source: each runs webpack's CSS/HTML minifier and the ecosystem's over popular framework stylesheets and real documents, printing one table per fixture — output size raw and under gzip/brotli/zstd (the `test:size` settings), best-of-3 wall and cpu ms, peak RSS (each minifier × fixture measured in its own worker process, so the numbers are attributable), and whether the output lost classes / changed the DOM ("rejects it" rows mean the tool errored on that input). They install the packages they compare against into `node_modules/.cache/` on first run rather than into webpack's dependencies; expect the first run to install for a minute and every full run to take a few.
- `assembly/` — WebAssembly source for the hash function.
- `setup/` — One-time setup scripts.

**Schemas (the source of truth for webpack's config API)**

- `schemas/WebpackOptions.json` — top-level webpack options schema.
- `schemas/plugins/*.json` — per-plugin option schemas (`BannerPlugin`, `IgnorePlugin`, `ProgressPlugin`, `SourceMapDevToolPlugin`, …).
- `schemas/_container.json`, `schemas/_sharing.json` — Module Federation sub-schemas.

**Tests** — see [TESTING_DOCS.md](TESTING_DOCS.md) for directory structure, naming, and how to run a single case.

- `test/` — All test suites (`cases/`, `configCases/`, `watchCases/`, `hotCases/`, `statsCases/`, `typesCases/`, `test262-cases/`, `html5lib-tests/`, `wpt/`, `css-parsing-tests/`, `benchmarkCases/`, `memoryLimitCases/`, etc.). `RoundTripConfigCases` re-bundles the output of `configCases` marked with a `roundTrip.js` file. `wpt/` is web-platform-tests, checked out one commit deep by the `html5lib` job alone — it is where the HTML tree-construction corpus lives since html5lib-tests dropped it.

**Examples & changesets**

- `examples/` — Usage examples (build with `yarn build:examples`).
- `.changeset/` — Pending changeset files for the next release.

**Hand-maintained type declarations (these _are_ editable)**

- `declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`.

**Configuration**

- `package.json` — All commands (defined in `scripts`).
- `tsconfig*.json` — TypeScript configs (one per surface: `lib`, `hot`, types tests, validation, benchmarks).
- `eslint.config.mjs`, `cspell.json`, `jest.config.js`, `generate-types-config.js` — Lint/spell/test/type-gen configs.
- `.github/workflows/`, `.github/scripts/` — CI.
- `test/patches/` — test-only dependency patches (e.g. jest-worker) applied via `git apply` in the CI Bun test job.

**How data flows — adding or renaming a webpack option** requires edits in every layer, in this order:

1. **Schema** — `schemas/WebpackOptions.json` (or `schemas/plugins/<Name>.json`).
2. **Defaults** — `lib/config/defaults.js`.
3. **Normalization** — `lib/config/normalization.js`.
4. **Implementation** — the site that consumes the option.

5. **Generated output and snapshots** — run `yarn fix:special`, then update the snapshots the option's _name_ leaks into. A schema property is read back by several tests that no `configCases/` pattern will match:
   - `test/__snapshots__/Cli.basictest.js.snap` — the CLI flags are derived from the schema, so every new property adds one.
   - `test/configCases/ecmaVersion/browserslist*/webpack.config.js` — these carry an **inline** snapshot of the resolved `output.environment`, so an entry there must be added to nine config files.
   - `test/__snapshots__/target-browserslist.unittest.js.snap` — same, per browserslist query.
   - `test/Validation.test.js` — its **inline** snapshots quote the "these properties are valid" list, so a new property under `module.rules` changes one. It runs in the `integration` matrix, not `basic`.

Skipping any layer silently breaks the option. After editing schemas, run `yarn fix:special` so `lib/` code can reference the updated types. If you added or modified options, consider updating `examples/` and run `yarn build:examples` to verify.

> [!REQUIRED] > **Never hand-edit what `yarn fix:special` generates**, even when it also reformats files you did not touch. That churn means your local toolchain resolved differently from CI's — the fix is to commit only your own hunks, then **verify them against the generator** (re-run it and diff), never to hand-write what you think it would emit. A hand-written JSDoc block that omits the `@since` line the schema's `added` keyword produces, or a `types.d.ts` member the JSDoc implies, fails `lint` with `… need to be updated` and nothing else.

**A nested minifier needs the same options as the outer one.** `lib/html/htmlMinify.js` runs the CSS minifier over an inline `<style>` and every `style=""`, so `output.environment` has to be handed to both — otherwise a `.css` asset and the same declaration inline disagree about what the target can read. Any future HTML-minifies-JS hook has the same obligation.

**Schema documentation keywords** — option entries in the schemas support these annotation keywords, which become JSDoc tags in the generated declarations:

- `"added": "<version>"` → `@since <version>`. The webpack version that first shipped the option. For a **new option that has not been released yet**, use the upcoming release version (current `package.json` version with the pending changesets applied — e.g. while on `5.108.x` with minor changesets pending, new options get `"added": "5.109.0"`).
- `"experimental": true` → `@experimental`. For options under `experiments` or otherwise subject to breaking changes.

These keywords are documentation-only: the tooling strips them from the precompiled validators. A property that is a pure `$ref` cannot carry them (schemas-lint forbids extra keys next to `$ref`) — annotate the referenced definition instead.

The two config layers differ: **`normalization.js`** canonicalizes the user-supplied config shape (shorthand → full form); **`defaults.js`** fills in values (often mode/target-dependent). Edit whichever matches your change.

**Adding a new dependency type:** pair the `Dependency` subclass with a `DependencyTemplate` (it emits the generated code), register the class with `makeSerializable(...)`, and wire the template into `compilation.dependencyTemplates`.

**Finding a hook:** hook definitions live on the class that owns them — compiler-wide hooks in `lib/Compiler.js`, per-`Compilation` hooks in `lib/Compilation.js`; tap them with a unique plugin-name string.

**Adding a runtime requirement:** declare the symbol in `lib/RuntimeGlobals.js`, emit its code with a `RuntimeModule` subclass, and inject it by tapping `runtimeRequirementInTree`/`additionalTreeRuntimeRequirements` on `compilation.hooks` (the `…InModule` variants for per-module needs).

## Code conventions

### Source language: CommonJS + JSDoc

`lib/` is CommonJS only. Use `module.exports` / `require()`, never `import`/`export` syntax. Types are declared via JSDoc — `@typedef {import("./Other")} Other` and friends — never TypeScript syntax inside `.js` files. The JSDoc annotations are compiled into `types.d.ts` by `yarn fix:special`.

### Type annotations

Prefer the most specific real type. `EXPECTED_ANY`, `EXPECTED_OBJECT`, and `EXPECTED_FUNCTION` (aliases for `any`, `object`, `Function`) are an escape hatch, not a default — reach for one **only** when the value genuinely can be any value, any object, or any function, and **never** when a real type fits. `unknown` is the same: use it for a value whose type you can't yet name (then narrow it), but if a real type (e.g. an imported `import("…").Foo`) fits, use that instead. This applies in `test/` too.

Prefer a generic (`@template`) over a widened type whenever a function's output type depends on its input — it keeps callers precisely typed instead of collapsing to `EXPECTED_ANY`.

### Naming

Spell names out in full — functions, variables, parameters, properties. Prefer `insertHtmlElement` over `insHtmlEl`, `attributeCount` over `attrCnt`, `current` over `cur`, `element` over `el`. Don't truncate or drop vowels to save characters; a clear name is worth the extra keystrokes.

The only exceptions are (1) established abbreviations webpack already uses pervasively (`ast`, `ns` for namespace, `id`, `url`, `css`, `js`, `dir`, `env`, `fs`) or spec-defined ones (`afe` for the HTML spec's "active formatting elements"), and (2) throwaway loop indices (`i`, `j`, `k`). When an abbreviation isn't already common in the codebase or the relevant spec, write the full word.

### Path regexps and helpers live in one file

> [!REQUIRED]

`lib/util/identifier.js` is the single home for path-shape regexps (`ABSOLUTE_PATH_REGEXP`, `WINDOWS_ABS_PATH_REGEXP`, `WINDOWS_PATH_SEPARATOR_REGEXP`, …) and for the helpers built on them (`parseResource`, `makePathsRelative`, `contextify`, `absolutify`, `getUndoPath`, …). **Import them from there — never re-declare a local copy**, even a one-liner like `/^[a-z]:[\\/]/i` or `/\\/g`. Duplicates drift apart, and each one becomes a second, subtly different definition of "absolute path" or "path separator" for the same codebase.

Before writing any regexp that matches a path shape, read the top of `lib/util/identifier.js` and its `module.exports` block. If the regexp you need is defined there but not exported, **export it and import it** rather than copying it. Only define a new one locally when nothing there fits — and then keep it next to the single function that uses it.

### Don't enumerate module or source types

> [!REQUIRED]

A list of module types, source types or dependency types written into `lib/` claims those are the only ones there will ever be. It is wrong the day one is added, and nothing fails — the new type silently takes whichever branch the list forgot. Ask instead:

- **Ask the object.** `module.getSourceTypes()`, `chunkGraph.getModuleSourceTypes(module)` and `moduleGraph.getParentModule(dependency)` answer for whatever exists, a plugin's own types included. `getParentModule` is the one worth knowing: concatenation re-points an incoming connection at the javascript module that absorbed the one holding the reference, so `connection.originModule.type` reads `javascript` for a css `url()` or an html `src`, while the module the dependency belongs to still reads `css` or `html`.
- **Match the class, not its name.** `dependency instanceof URLDependency` says what `dependency.type === "new URL()"` only approximates, and it survives a rename.

**A feature flag is that same list in disguise.** Gating on `options.experiments.<x>` to mean "which types can exist here" is the harder version of the mistake to spot, because it reads like configuration rather than an enumeration — and it goes stale the same way.

When a branch genuinely has to name types, **write it so an unknown type takes the safe side**. Name the one special case and let everything else fall to the general answer (`typePrefixEquals(type, JAVASCRIPT_TYPE)` … `else` reads the asset url), or list what provably needs nothing and treat the rest as needing it (`TYPES_WITHOUT_CHUNK_HANDLER`). A list whose `else` branch does nothing is the shape to avoid.

### Source file headers

Every source file under `lib/` (and `hot/`, `tooling/`) opens with the MIT license header. When adding a **new** file, set the `Author` line to its actual author (`Author <Name> @<github-handle>`) — don't copy another file's author line.

### Code comments

> [!REQUIRED]

Comments inside `lib/`, `hot/`, `tooling/`, and `test/` must be **as short as possible** — ideally one line, at most two short lines. Every line must add information a careful reader can't get from the code itself: a hidden invariant, a non-obvious ordering constraint, a workaround, or the name of the higher-level concept the block implements. **Never** write multi-paragraph essays, restate what the next line obviously does, narrate the diff, restate the PR description, or quote the user/task framing.

JSDoc on exported symbols stays as-is — that's the type contract, not commentary.

## Testing

For directory structure, naming, and how to run a single case, see [TESTING_DOCS.md](TESTING_DOCS.md).

**For bug fixes, always write the test case first.** Run the test to confirm it fails, then make the code change and re-run. For new features, tests can be written alongside or after.

**Prefer integration tests over unit tests.** Cover behavior with an integration case (`configCases/`, `watchCases/`, `hotCases/`, `statsCases/`, …) that drives a real `webpack()` build whenever the behavior can be exercised that way — they catch real-world regressions a mocked unit test misses. Reach for a `*.unittest.js` only for pure helpers/utilities that a build can't naturally reach.

**Snapshot printed code; assert everything else.** When what a test checks _is_ generated output — emitted bundles, minified CSS / HTML, serialized ASTs, stats text — use `toMatchSnapshot()` rather than hand-written `expect(...).toBe(...)` on fragments of it. A hand-written expectation over printed code pins one substring and silently ignores every other byte the printer emits, so a regression next to it passes; a snapshot shows the whole diff and is reviewed as one. The reverse holds for everything that is not printed output — behavior, invariants, equivalences, error paths — where an explicit `expect` states the contract and a snapshot only records whatever happened to be true.

Two things follow. Never snapshot a value a test cannot produce on every machine: a snapshot that is skipped when an optional tool (a browser, a native binary) is absent is reported as obsolete and fails the run there. And keep control characters out of a snapshot — one NUL makes git treat the file as binary and stop showing its diff, which is the only reason the snapshot exists.

Run targeted tests — `yarn test:base --testPathPatterns="<pattern>"` or `yarn test:base -t "<name>"`. Never invoke `yarn jest`/`npx jest` directly: the required `--experimental-vm-modules` node flag lives only in the `test:base` wrapper, and bare jest crashes ESM/test262 suites. Don't run `yarn test` unless asked. When updating snapshots (`yarn test:base -u`), eyeball the diff first.

**Run only tests specific to your change — leave the broad suites to CI.** Pick the cases that cover the touched code (`--testPathPatterns` / `--testNamePattern`) instead of sweeping whole suites.

> [!REQUIRED] > **Two kinds of change widen the blast radius past "the tests for my change".** Touch `schemas/**`, `lib/config/**`, or anything `yarn fix:special` generates, and what moves is the whole option surface, not the feature. That does **not** mean sweeping the suites locally — push and let CI sweep them, then [read the failing job's log](#read-ci-rather-than-re-running-it). Locally, run only the cheap targeted stages: the `configCases/` your change touches, plus `yarn lint:code` and `yarn fix:special` (whose own output tells you whether a generated file is stale). `basic` gates the `integration` matrix in `.github/workflows/test.yml` (`integration: needs: basic`), so a red `basic` stops every integration upload and leaves the coverage report computing patch coverage from the unit suite alone — a failure that reads like a coverage problem but is not one.

> [!REQUIRED] > **Every stage of `lint` runs before every push — not a chosen few, and not only the files you edited.** `yarn lint:types` plus `npx eslint <the files I touched>` is **not** "lint passed": it skips `lint:special`, which fails on a stale generated file, and `lint:spellcheck`, which reads every Markdown file in the repo. `yarn fix` is not it either — it regenerates and formats, but runs no type check and no spellcheck, so **run `yarn lint` after it** (or walk all nine stages by hand when an earlier one trips on sandbox drift). And read each stage's output whole: piping it through `tail` or `grep` is how a finding two lines above the summary reaches CI instead of you.
>
> **A generated file is stale the moment any JSDoc it copies changes — including the prose.** `types.d.ts` carries the comment above `process()`, not just its signature, so rewording that comment invalidates the check. Editing a signature and forgetting its doc paragraph fails `lint` with `types.d.ts need to be updated` and nothing else — the same message a missing member gives, which is why it reads as a code problem when it is a comment problem. After splicing your hunks, diff your file against the generator's whole output for that symbol's region and confirm the **region** matches, not just the lines you meant to change.

`yarn lint` is a `&&` chain, so the first stage that trips on sandbox drift hides every stage after it. When `lint:special` reports declarations "need to be updated" that `main` reports too, do not stop there — run the rest by hand (`lint:types`, `lint:types-test`, `lint:types-benchmark`, `lint:types-module-test`, `lint:types-hot`, `fmt:check`, `lint:spellcheck`). `lint:types-test` is the one that catches `tsc` errors in `test/`, and skipping it is how a red `lint` survives a "lint passed locally".

Also note that a local failure is only yours if it does not reproduce on `main`. Check with a worktree (`git worktree add <dir> origin/main`) before spending time on it: sandboxes routinely fail `Cli createColors`, `profiling-plugin` and the `many-replacements` cases for environment reasons, and the generated-declaration check flags files CI is perfectly happy with. In particular, do **not** run the spec-conformance suites (`yarn test:test262` / `yarn test:html5lib` / `yarn test:css-parsing`) as a routine local verification step — `test262` alone takes tens of minutes — and don't run the full `test:integration` matrix locally. CI runs all of them on every push; locally, run the `configCases/` relevant to your change.

This is a hard rule, not a preference: a broad local sweep costs many minutes, and on a busy machine it manufactures timeout failures that look like regressions but reproduce nowhere else. Narrow the pattern until the run is seconds. Two habits keep this honest:

- **Never read a pass/fail verdict through a pipe.** `yarn test:base … | grep …` discards jest's exit code, so a red run reads as green. Check the exit status, or read the `Tests:` summary line directly.
- **Never attribute a failure without a base run.** Before assuming a failing case is yours, re-run that exact case on the unmodified files. Most surprises are pre-existing or contention flakes.

### Read CI rather than re-running it

> [!REQUIRED]

**When CI is red, read its log — do not reproduce the whole job locally.** The run already holds the answer, and re-running `yarn lint` or a whole suite to rediscover one line costs minutes and a great many tokens. Filter the run to its failing jobs (`gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion=="failure")'`, or `list_workflow_jobs`), read that job's log (`gh run view --job <id> --log-failed`, or `get_job_logs` with `return_content` — its tail is mostly `Post job cleanup`, so ask for enough lines to clear that), then reproduce **only the case it names**: `yarn test:base --testPathPatterns="<file>"`, `yarn test:basic --testNamePattern="<category> <case>"`, or `npx eslint <file>`.

Two traps: a step is not a job — `Run yarn lint` sits inside the `lint` job, and a step's id fetches the wrong log, so select the object with a `steps` array. And `yarn lint` stops at its first stage, so a CI failure in `lint:code` says nothing about the later ones, just as a local `lint:special` complaint `main` also makes says nothing about CI.

### Verifying a performance or memory change

> [!REQUIRED]

A perf/memory claim needs evidence, and the cheap kinds are the trustworthy ones. Prefer, in this order:

1. **Counting** — call counts, allocation counts, retained object counts. Deterministic; run it once.
2. **CPU-profile attribution** — `node --cpu-prof`, then sum self time per bucket. Robust to a loaded machine.
3. **Retained heap** — `node --expose-gc`, GC several times, read `v8.getHeapStatistics().used_heap_size`.
4. **Wall/CPU timing** — last resort. Interleave the arms in one process, report `n` and dispersion, and treat a difference smaller than the run-to-run spread as no result.

`FILTER="<case-name>" yarn benchmark` drives the repo's own cases; `test/benchmarkCases/` is the fixture set.

A claim about **webpack's CSS or HTML minifier versus the ecosystem's** (size, speed, memory, or safety) is already harnessed: run `yarn benchmark:css-minifiers` / `yarn benchmark:html-minifiers` and read the tables — see the `tooling/` entry in [Architecture](#architecture) for what they report — rather than hand-rolling a comparison.

A claim about the **size of what webpack emits** is the counting kind, and `yarn test:size` is how it is counted: it builds every `configCases/` case with the defaults a user gets and reports the raw/gzip/brotli/zstd size of every asset, so a change to `lib/runtime/` or to a dependency template shows up as bytes on the wire. Compare two runs with `--baseline <report>`; the `Code Size` CI job does the same against the report `main` last uploaded and comments the diff on the pull request.

Pitfalls that have produced wrong conclusions here:

- **Micro-benchmarks of one function lie.** V8's escape analysis deletes non-escaping allocations and the compilation cache hides repeated `new Function` cost. Measure inside a real build.
- **Changing async structure is not neutral.** Adding a `process.nextTick`/`setImmediate`, or collapsing callbacks, reorders module processing and drags order-dependent work with it. Prove the order is unchanged before believing the delta.
- **Pick a fixture that actually emits.** `three-long` tree-shakes to a 0-byte bundle in production, so it skips codegen/render/minify entirely and inflates any front-end phase's share. Corroborate on a case that emits code.
- **Verify semantics every time** — module count, hash of the emitted files on disk, and errors/warnings counts must be unchanged. Comparing two empty outputs proves nothing.

**Run one integration case** by name (`<category> <case-name>`, e.g. `css basic`):

```sh
yarn test:basic --testPathPatterns="ConfigTestCases" --testNamePattern="<category> <case>"
```

Swap `ConfigTestCases` for `StatsTestCases`, `HotTestCases`, `WatchTestCases`, … (full matrix in [TESTING_DOCS.md](TESTING_DOCS.md)). The `test262`/`html5lib`/`css-parsing` suites are git submodules — run `git submodule update --init test/<dir>` first, or they fail confusingly.

**Writing a `configCases/` case:** a case is a mini project — `index.js` (runs assertions; a thrown error fails the test) plus `webpack.config.js`. The emitted bundle is actually executed, so it must run. Optional per-case files: `errors.js` / `warnings.js` export arrays of matchers for expected build diagnostics (without them, any error/warning fails the case); `test.filter.js` returns `false` to skip the case (e.g. gate by Node version); `test.config.js` customizes the run (e.g. `findBundle`).

**Cover every line you add or change.** A commit must not lower coverage: each new branch, fast path, and fallback needs a test that exercises it (CI's coverage report enforces this on the patch, target 90%+). Cover new branches with `configCases/` whenever a real build can reach them; fall back to a focused `*.unittest.js` only when a config case can't reasonably drive the branch (or a build-level test adds nothing) — e.g. tokenizer cold-path fallbacks, where each branch (fast and delegated) still needs exercising. Check `yarn cover:unit` locally, or the PR's "patch" coverage report, and add cases until no changed line is missing.

**Don't lower type coverage either.** webpack tracks how much of `lib/` is precisely typed; CI collects it (`yarn types:cover:report`) and reports the delta on the PR. Keep it from dropping — prefer real types over `EXPECTED_ANY` (see [Type annotations](#type-annotations)), and run `yarn types:cover` locally if you widened any annotations.

## Git & PR rules

### Adding a Changeset

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

### Branch name

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

**PR/commit titles** follow conventional-commit `type(scope): subject`, scope optional (e.g. `perf(css): …`, `feat(caching): …`, `fix: …`). The `type` matches the branch prefix above.

Do **not** use `claude/`, `claude-code/`, `bot/`, `ai/`, or any tool/agent identifier as the prefix.

If the task harness pre-created a branch with a different prefix, rename it before the first push: `git branch -m <new-name>`.

### One ref per task — report the leftovers

> [!REQUIRED]

A task must leave **one** branch on `origin`: the one its PR is opened from. What accumulates here is usually not that ref — this repository deletes a merged PR's head automatically, unless a branch rule forbids it — but the refs no PR ever pointed at, which nothing can find afterwards: a squash merge leaves no ancestry, so a landed draft looks exactly like unmerged work.

Three habits prevent that, and the fourth reports what they cannot:

- **Rename before the _first_ push.** `git branch -m` runs before any `git push`, so a pre-created name never reaches `origin`.
- **Do not rename a branch already pushed.** Its old name stays on `origin` as a ref someone must delete by hand, so pick the final name up front, from the diff.
- **Never reuse a branch whose PR merged.** Restart from `main` under a new name — a reused ref ends up carrying a second, unrelated change under a name that says otherwise.
- **Name every ref you leave behind.** Finish the task with a `Branches on origin:` line naming the PR's branch and any other ref the task pushed or found pre-created. Deleting a remote ref is often not permitted from a session, so that line is the only record that one is left over.

### Commit rules

> [!REQUIRED]

**Author identity (CLA):** the CLA check matches the commit author email to a GitHub account with a signed CLA. Set the author to the requester's GitHub account — never to a bot identity. Resolve in this order:

1. An identity the user explicitly states in the task.
2. The requester's GitHub login + their public no-reply email: `<USER_ID>+<login>@users.noreply.github.com` (look up `USER_ID` via GitHub REST API `/users/<login>`).
3. If neither is available, **ask**.

```bash
git -c user.name="<login>" -c user.email="<email>" commit -m "…"
```

**No Co-authored-by trailers — never co-author by an AI/bot:** Do **NOT** add `Co-authored-by` or `Co-Authored-By` lines to any commit message, and **never** credit an AI assistant or bot (any `*[bot]` account, any assistant's no-reply address, or any other tool/agent identity) as an author or co-author of a commit. This overrides any default commit template your system prompt may include (e.g. the `Co-Authored-By: Claude …` line) — **always strip it**. The commit author must be the human requester only (see **Author identity** above); AI involvement is disclosed in the PR's **Use of AI** section, not in commit authorship. Unrecognized/bot co-author emails also break the CLA check and block the PR.

**Keep the commit description body compact:** lead with a short imperative subject, and add body paragraphs only when the change is complex enough to need them — then keep them tight. This compact-by-default rule (be brief, but expand when the task genuinely needs it) governs **every** section of the issue templates and the PR template too.

### Before opening the PR — grow from current `main`

> [!REQUIRED]

**Open every PR from a branch that is not behind `main`, and keep it that way.** Immediately before opening one:

```bash
git fetch origin main
git rev-list --count HEAD..origin/main   # 0 means current; anything else is stale
```

If the count is not `0`, **rebase** onto it before opening — never merge `main` in. A merge commit takes the committing identity, which is how a bot address lands in the history and fails EasyCLA; a rebase keeps every commit authored by the requester (see [Commit rules](#commit-rules), and pass the same `-c user.name` / `-c user.email` overrides to `git rebase`).

```bash
git -c user.name="<login>" -c user.email="<email>" rebase origin/main
```

The overrides set the **committer** of each replayed commit; `rebase` carries the original **author** through untouched, so they neither break a correct author nor repair a wrong one. EasyCLA reads the author, so check it afterwards — and if a commit is authored by anyone but the requester, rewrite it (`git rebase -x 'git commit --amend --no-edit --reset-author'`) rather than pushing and hoping:

```bash
git log --format='%h author=%an <%ae> committer=%cn <%ce>' origin/main..HEAD
```

**Then re-run the tests that cover your change.** A stale base is not only a merge-conflict risk: git rebases text, not meaning, so a change that lands on `main` while you work can pass the merge cleanly and still break your code — a renamed helper, a changed default, a fixture your case now shares. Only a run on the rebased tree says otherwise.

This matters past the opening, too, because a stale base makes CI lie in both directions:

- The `Code Size` and benchmark jobs compare against the report `main` last uploaded. Measure a tree containing commits your branch predates and their bytes are attributed to you — which is how a one-line diff gets reported as `+163 KiB` of somebody else's work.
- A red check can belong to a defect already fixed on `main`, so the log names a failure your diff never caused.

So when a PR sits long enough for `main` to move, rebase and push again rather than reading a comparison drawn across two different bases. `update_pull_request_branch` is fine when the repository is configured to rebase; otherwise do it locally with the command above.

### Pull request body

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

### After push — verify PR body

After every `git push` of a new branch, check whether a PR was auto-created (webpack has this webhook). If so, `update_pull_request` to install the full template — the auto-created body never matches.

### Watching a PR, and updating its branch

> [!REQUIRED]

**Subscribe to every pull request you open** (`subscribe_pr_activity`), as the last step of opening it. Not a question to put to the requester: a PR you opened is one you own until it lands, and [every check ends green](#after-opening-the-pr--every-check-ends-green) and [the automated reviews](#after-opening-the-pr--wait-for-the-automated-reviews) both need the session awake to be honoured at all. Stay subscribed until the PR is merged or closed, or the requester says to stop.

What an agent reaches for by the same reflex and must **not** do unasked, because webpack's maintainers usually land a PR through their own pipeline:

- **Rebasing, or merging the base branch into the PR branch.** A branch merely behind `main` is not a defect to fix, and doing it unasked rewrites history someone else's pipeline was about to handle, restarts every check, and can drop an approval. Do it when the requester asks, or when the PR is reported genuinely un-mergeable — and say which of the two applies before pushing.

Pushing your own commits to your own branch stays free. What needs asking is anything that changes how the PR gets landed.

### Writing on GitHub — ask first

> [!REQUIRED]

**Never post to GitHub on your own initiative.** Pushing commits to your own branch is fine; publishing text other people read is not. This covers PR comments, review replies, issue comments, edits to the PR body after it is opened, and every reply to a bot, whichever bots the repository happens to run.

The rule bans **posting**, not **reading**. What may be skipped is bot noise — a status check, a benchmark that swings on a re-run, a coverage report still waiting on uploads, a changeset/preview echo. Replying to those costs maintainers more attention than the finding did.

Everything that names a possible bug, regression, or improvement must be investigated, whoever raised it — a human reviewer or an automated one. Being posted by a bot account is no reason to dismiss it; judge the claim, not the author. Reproduce it, then either fix it in code and push (that needs no permission) or, if you believe it is wrong, bring it **into the session**: report what you found, show the reply you would send, and let the requester decide whether it is posted. Never leave such a finding unanswered.

### After opening the PR — every check ends green

> [!REQUIRED]

**The target is the whole run green — every check, not a chosen few.** A red check on your PR is never something to explain, defer, or wait out. There is no such thing as ending a wake on one without either a pushed commit or a reply naming the blocker, and "that one is not important" is not a judgement to make on your own.

Two things follow from that, and neither is an exception to it:

- **A check that failed once is re-run before it is believed.** Infrastructure fails: a runner dies, a network fetch times out, an engine crashes on its own bug rather than on yours — the tell is a job that reports every test passing and then dies anyway. Re-run the failing job. **If the re-run fails the same way, ignore it and move on** — do not keep re-running it, do not rewrite working code around it, and do not hold the PR on it.
- **Coverage is read once the suites that upload it have finished** — see the rule at the end of this section.

Neither of those excuses a check you can run yourself. **A check that reproduces locally is never one you re-run and shrug at**: it runs the same command you can type, so a failure in it is a failure you introduced until a run on unmodified `main` proves otherwise. Fix it and push.

Read the failing job's log rather than guessing — see [Read CI rather than re-running it](#read-ci-rather-than-re-running-it) for how to get to it in three calls — then reproduce **only the case it names**, fix the cause, and re-run that one case before pushing. Re-running the whole job locally to find what the log already says is the waste that section exists to stop. Two failures recur often enough to name:

- **cspell** rejects a word — reword it (the codebase is American English, and [Naming](#naming) forbids abbreviations) or, for a genuine term, add it to `cspell.json`.
- **A snapshot lives in more than one suite.** `ConfigTestCases` and `ConfigCacheTestCases` both snapshot `configCases/`, and `--testPathPatterns=ConfigTestCases` does **not** match `ConfigCacheTestCases`. Update snapshots with `yarn test:basic --testNamePattern="<case>" -u` (no path filter) — the name filter keeps it to that case in both suites, so there is no need to follow it with a full `test:basic`.

A report that measures rather than tests — performance, memory, a preview build — still gets investigated, but it is answered with evidence, not with a reflex commit. Reproduce the claim first (see [Verifying a performance or memory change](#verifying-a-performance-or-memory-change)); a comparison against a base that never ran, or one drawn across different runner environments or a different set of co-running cases, is an artifact and usually says so in its own output. Reporting an artifact as an artifact is a green outcome — silently leaving it unexamined is not. Posting a reply to the bot needs permission ([Writing on GitHub — ask first](#writing-on-github--ask-first)).

**Do not read, chase, or act on coverage until every suite that uploads it has finished.** Coverage arrives in pieces: each test suite uploads its own flag as it completes, and the service recomputes the totals after every upload. Until the last one lands the number on the PR is a partial sum — it will show a large drop, the comment will be rewritten in place several times with different percentages, and a deficit at that moment means "some suites have not reported yet", not "you lost coverage". The report itself says so, naming how many uploads the head is still missing; **read that line before reading the percentage**, and treat a non-zero count as "not ready" no matter how alarming the number next to it. **A red coverage check while coverage changed is the normal state of a healthy PR mid-run** and is not a failure to fix.

**What you are waiting for is those suites, not the whole run.** The uploading suites are the jobs that call the coverage action in `.github/workflows/test.yml` — today `unit`, `integration`, `test262`, `html5lib` and `css-parsing` (`integration` is sharded, so it alone accounts for most of the uploads, and it is gated behind `basic`). Read the workflow rather than this list if they have moved. Everything else on the PR — benchmarks, code scanning, dependency review, preview publishing, type-coverage, the changeset echo — never uploads a coverage report and cannot move the number, so a coverage gap is safe to fix while they are still running or even while one of them is red. Waiting on them buys nothing.

Once those suites are in, read the report; only then is a genuine patch gap worth adding a test for. Chasing an intermediate number costs a round of pointless commits and, worse, tempts changes to `lib/` that exist only to move a percentage.

### After opening the PR — wait for the automated reviews

> [!REQUIRED]

Every webpack PR is reviewed automatically on the initial commit and on every subsequent push, by whichever automated reviewers the repository has enabled. You must always wait for them and address every comment from each. A finding from a bot is judged on the claim, never on the author: reproduce it before you decide.

1. After `create_pull_request`, subscribe to the PR (`subscribe_pr_activity`) — see [Watching a PR, and updating its branch](#watching-a-pr-and-updating-its-branch). Once subscribed, a review wakes the session, so do **not** poll.
2. When a review arrives, read every comment:
   - If correct, push a fix in a new commit — **including when the bug is one your own PR introduced**, which is the common case for a bot flagging a line you just wrote.
   - If wrong, draft the reply and ask the requester before posting it (see [Writing on GitHub — ask first](#writing-on-github--ask-first)) — never ignore silently.
3. After every push, the reviewers run again. Repeat step 2. The loop ends when the latest review from each has zero outstanding threads.
4. Only `unsubscribe_pr_activity` once all comments are handled and CI is green, or when the user tells you to stop.

## Do not touch

> [!REQUIRED]

These files are produced by `yarn fix:special` and must not be edited by hand:

- `types.d.ts` — compiled from JSDoc + schemas.
- `declarations/**/*.d.ts` — per-schema/plugin declarations emitted from `schemas/**/*.json`.
- `schemas/**/*.check.{js,d.ts}` — precompiled schema validators.
- Generated runtime code under `lib/` (driven by `tooling/generate-runtime-code.js`).
- `lib/css/data.js` — every table the CSS minifier looks a name up in, and the arithmetic its math-function descriptors bind to: derived from `mdn-data` + `color-name` (box shorthands, color-argument and math functions, named colors) plus the generator's `SUPPLEMENT` of spec-prose tables and math primitives, by `tooling/generate-css-data.js` — which also holds the value-definition-syntax parser those grammars are read with, and runs the generation only as the entry point so its tests can require it.
- `lib/html/data.js` — every table the HTML parser and minifier look a name up in: the reflected-attribute tables distilled from webref's HTML IDL (vendored as `tooling/html-reflect.json`), plus the generator's `SUPPLEMENT` and `PARSER_TABLES` of §13.2 tree-construction vocabulary, by `tooling/generate-html-data.js`.

Both `syntax.js` files are algorithm only — a new lookup table belongs in the matching generator, not next to the code that reads it.

**And in the generator, derive it — do not type it out.** Read the table out of a published dataset (`mdn-data`, `color-name`, the vendored webref IDL) whenever it is derivable at all, _including by analyzing a grammar rather than by listing names_: the value-definition syntax states which properties take an `<integer>`, so that set is computed, never enumerated. A table already in `SUPPLEMENT` counts as a source too — cosine at each eighth turn is sine two eighths along, and each inverse trig table is its forward one read back, so one stated table can carry several.

**Per-construct behaviour is a table as well.** Where the minifier does something different for each name — each math function, and whatever comes next for properties or at-rules — the per-name part belongs in the generator as a descriptor and the shared part in `syntax.js` as an engine keyed by it. `MATH_FUNCTION_FOLD` is the worked example: it says how each function's arguments are read, which arithmetic runs and what unit the answer carries, so `syntax.js` implements neither and names no function of its own. The arithmetic is emitted alongside the descriptors and bound to them by reference rather than by name, so a name nothing defines fails generation rather than folding nothing. Adding a function is then adding a line, and a name whose arithmetic already exists needs nothing else. A test must still drive every descriptor — one input per entry is enough to turn a wrong-but-existing binding into a failure instead of a silent decline. Listing names by hand into a generator's `SUPPLEMENT` is the last resort, and every entry there carries the reason it cannot be derived — spec prose, an equivalence between two spellings, a judgement no dataset states. A hand-typed list goes stale the next time a spec moves and nothing in CI notices; a derived one turns the same spec change into a reviewable diff.

The hand-maintained type declarations (`declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`) _are_ editable.

Re-run `yarn fix:special` **before the next commit** whenever you touch:

- `schemas/**/*.json` — reshapes validators, declarations, and `types.d.ts`.
- `lib/**/*.js` JSDoc on anything reachable from a public export — regenerates `types.d.ts`.
- `tooling/generate-runtime-code.js`, `tooling/generate-wasm-code.js`, `tooling/generate-css-data.js`, `tooling/generate-html-data.js`, or any file they consume (including the `mdn-data` / `color-name` versions in `package.json` and the vendored `tooling/html-reflect.json`).

CI's `lint` job verifies these outputs are up to date. The combined `yarn fix` script runs `fix:code` + `fix:special` + `fmt` in one go; prefer it as the final step.

## Gotchas

### Target the Node baseline

`lib/` and `hot/` ship as raw source (no build step) and must run on **Node ≥ 10.13** (the CI matrix goes down to Node 10.x). Don't use syntax or runtime APIs newer than that baseline — e.g. no optional chaining (`?.`) or nullish coalescing (`??`) — or the code passes locally and fails the Node 10 CI job.

### Runtime code ships to every target

Code that emits runtime into the bundle — chunk loading (`lib/web/` JSONP, `lib/esm/`, `lib/node/`, `lib/webworker/`), prefetch/preload/resource hints, library and externals presets — is **per-target**: each preset (browsers/JSONP, ESM `output.module`, `node`, `webworker`, `deno`, `electron`, `bun`, and the **universal** `target: ["web", "node"]` neutral-platform path) has its own runtime module or wiring. Changing one and forgetting the others is the easy mistake here. When you touch runtime-emitting code, apply it to **every** affected target and add an integration case per target (typically `target: "web"`, `experiments.outputModule`, and `target: ["web", "node"]`; add `node`/`webworker`/`bun`/`deno`/`electron` when they're in scope). The universal/neutral-platform runtime guards browser-only APIs behind `typeof document === "undefined"`, so those bundles run Node-side without a DOM — its config case must gate DOM assertions on `typeof document !== "undefined"` (see `configCases/target/universal-prefetch-preload`).

**Then look at what it costs on the wire.** `yarn test:size` — and the `Code Size` CI job, which compares against the report `main` last uploaded and comments the diff on the pull request — builds every `configCases/` case and reports **one row per changed asset**: raw before → after, plus what each of gzip/brotli/zstd makes of it. **It is information, never a verdict: it does not fail, and a change that moves the numbers is not a defect.** It exists to answer two questions, so answer them:

- **Which files changed, and by how much?** The asset table is the headline, so a generator or minifier change reads as the files it moved rather than as one number over the suite. A suite-wide total is deliberately not reported: it says nothing you can act on. Raw is what the generator wrote; the compressed columns are what a user downloads, and the two disagree often enough to be worth reading together — a rewrite that saves raw bytes but not gzip bytes has mostly moved entropy around.
- **Which way did it go?** A row is marked 🔴 ↑ when it grew and 🟢 ↓ when it shrank, so the direction reads before the number does.
- **Did a runtime gain or lose a runtime module?** A second table counts the runtime modules each runtime carries and names the ones that came or went. Bytes are deliberately not reported per runtime module — what one weighs in isolation is not what anyone downloads, and the asset table already carries the real number. The count is: it catches a runtime module added for one target and forgotten for another, which is the mistake this section is about.

Read the "emitted nothing" note before the numbers: a case whose build now errors contributes no bytes, which otherwise reads as an improvement.

Say what it reported in the PR when the numbers moved.

### Lint covers every file, docs included

The `lint` job runs Prettier (`fmt:check`) and cspell (`lint:spellcheck`) across the **whole repo** — Markdown and this guide too, not just `lib/`. Run `yarn fix` before pushing even a docs-only change: an unaligned Markdown table or a word cspell doesn't know fails `lint` on its own. For a new/unusual word, add it to the `words` list in `cspell.json` (or reword); Prettier reformats Markdown tables, so hand-written columns must match its output.

### The persistent cache has to keep working

> [!REQUIRED]

Persistent caching is a shipped feature, not a test mode. `ConfigCacheTestCases` re-runs **every** `configCases/` case with `cache.type: "filesystem"` and fails it if the second or third run writes anything back into the pack. The log line is:

```
Pack got invalid because of write to: <identifier>
```

and `<identifier>` is the thing that was **not** restored — it was rebuilt instead. On a user's machine that is work redone on every incremental build, so **treat this as a defect and find the cause**. Do not silence it.

Persistent caching serializes the module graph, so any new serializable class (a `Module`, `Dependency`, or error subclass, a cached value, …) must call `makeSerializable(...)` — the pattern is used across ~140 files — and `yarn fix:serializables` regenerates `internalSerializables`. Forgetting is the most common cause, and it is silent apart from the line above.

The cache suite runs with `infrastructureLogging.debug`, so the log usually names the real cause a few lines earlier. What each one means:

- `No serializer registered for <Class>` — that class never called `makeSerializable(...)`.
- `Skipped not serializable cache item '<key>'` — something reachable from the value cannot be written.
- `Restoring failed for <identifier> from pack: <err>` — it _was_ written, and deserialization threw. Deserialization re-enters the constructor with **no arguments**, so a constructor that dereferences a parameter (`err.message`) must guard (`err ? err.message : ""`).
- Nothing at all — the identifier is not stable between runs, or the module reports that it needs rebuilding.

**Never silence it with `test.filter.js`.** `module.exports = (config) => !config.cache` drops the case from the cache suite entirely, so nothing about that feature is cache-tested any more — including the parts that did work. A new case must pass under both suites.

The one expected write webpack ships today is a module carrying a **build error**: `NormalModule.needBuild` returns true whenever `this.error` is set, because webpack retries errors on every build. A case whose subject _is_ an error therefore invalidates the pack by design, and states so with an `infrastructure-log.js` returning `[/Pack got invalid because of write to/]` when `cache.type === "filesystem"` (~20 cases already do). That is the only mechanism that needs no further justification; any other expectation carries the reason it is not a bug, written next to it — and "it is noise here" is not a reason.

### Performance and memory

webpack is a bundler — users measure it by build time and peak heap usage. Many changes in `lib/` end up on per-module hot paths (sometimes per module × runtime, or per chunk × module) on user builds, so constant factors compound. Always weigh the time and memory cost of a change, including bug fixes and refactors: less allocation, smaller `Map`/`Set` footprints, and fewer closures retained on hot paths are wins worth pursuing — less is better. When introducing or holding any per-`Compilation` state, ask whether it can be released after seal/emit so large compilation data structures are not retained longer than necessary. See #15521 for an example of how this class of memory issue can surface. Sanity-check a perf change locally with `FILTER="<case-name>" yarn benchmark` before CI's performance benchmarks flag a regression.

### Keep instance shapes stable

Initialize **every** instance field in the constructor, including ones first assigned later in a method — default them to `undefined`/`null`. Assigning `this.newField` for the first time outside the constructor forces a V8 hidden-class (Shape) transition, so instances of one class end up split across shapes and the inline caches reading them go polymorphic/megamorphic — a hot property read can cost ~2× at two shapes and more when megamorphic, and code already optimized for the first shape deopts with a `wrong map` bailout. Never `delete` an instance field (it forces the object into dictionary mode); set it to `undefined` instead. The win per field is small for a single trailing field, but the rule is uniform on purpose so reviewers don't judge it case by case — it is why, for example, `Dependency` sets all its `_loc*` slots up front. Deliberate symbol-keyed sparse slots are the documented exception.

When adding a field to a class whose fields are compiled into `types.d.ts` (public, non-`_`-prefixed), re-run `yarn fix:special` — constructor order determines member order in the generated declarations.
