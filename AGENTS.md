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

This is the canonical repository map. **When you add, rename or remove a top-level directory** (under the repo root, `lib/`, `test/` or `schemas/`), update its bullet here in the same commit — CI doesn't check it, only humans catch drift. If a directory fits no group, add a group rather than dropping the entry.

**Source**

- `lib/` — main source (CommonJS; JSDoc types). Its **root is the core** — what a build is made of (`Compilation`, `Compiler`, `Dependency`, `MultiCompiler`) and what publishes it (`webpack.js`, `index.js`) — plus re-export shims keeping old `webpack/lib/<Name>` paths open for the ecosystem. **A plugin never belongs in the root**: it goes in the directory for what it acts on (asset set → `lib/output/`, module graph → `lib/optimize/`, entry → `lib/entry/`); if none fits, add a directory, with its bullet here, in the same commit. A file leaving the root owes a shim at its old path only once it has shipped there; `yarn find-deep-imports --check` and `deepPathShims.unittest.js` decide.
  - `lib/asset/` — asset modules (images, fonts, raw files), incl. the `asset/webmanifest` type parsing `<link rel="manifest">` icon URLs.
  - `lib/async-modules/` — top-level await.
  - `lib/bun/` — Bun target externals preset (`bun:*` and Node built-ins).
  - `lib/cache/` — filesystem and memory caches.
  - `lib/config/` — user config → `Compiler`: `validateSchema` checks the schema, `normalization.js` canonicalizes the shape, `defaults.js` fills values, `WebpackOptionsApply` applies the implied plugins. `WebpackOptionsDefaulter` is the deprecated normalize+default pair; `OptionsApply` is the apply step's base class. Also the target presets, `defineConfig`, and `PlatformPlugin` (pins the platform a `target: false` build can't infer). `cli.js` reads the schema the other way — derives CLI flags and applies parsed args back — hence webpack-cli uses it via `webpack.cli`. That object's terminal colors are `lib/util/terminalColors.js`, kept apart so reading a color doesn't parse the schema.
  - `lib/container/` — Module Federation.
  - `lib/context/` — context modules (`require.context`, dynamic request directories) and the plugins narrowing them; their dependencies are `lib/dependencies/context/`.
  - `lib/css/` — CSS Modules, parsing, generation. `syntax.js` reaches `syntax-parser.js` (reads) and `syntax-printer.js` (writes) through getters, like `javascript`, so a walk that never prints never loads the printer. It publishes those two plus `SourceProcessor` only — read a former re-export off `parser` or `printer`. `topologicalSort` (Kahn's algorithm, source-order tie-breaking) lives here because only `CssParser` calls it, to order the `composes … from` files and give each one's first import dependency its `sourceOrder`.
  - `lib/debug/` — debug helpers.
  - `lib/define/` — replacing a free identifier with a constant at parse time: `DefinePlugin`, plus `EnvironmentPlugin` (fed from `process.env`) and `DotenvPlugin` (from `.env`). `ProvidePlugin` substitutes an import, not a value → `lib/provide/`.
  - `lib/dependencies/` — concrete `Dependency` subclasses and their templates (ESMImport, CommonJsRequire, RequireContext, …); the base `Dependency` is in `lib/graph/`, `DependencyTemplate` in `lib/template/`. Its root holds only the re-exports old paths owe (`NullDependency`, `ConstDependency` and `ContextElementDependency`, each imported by a published webpack 5 package). Everything else is a directory: `core/` for what every family builds on — the bases, both `ModuleDependencyTemplateAs*`, `ImportPhase` and the shared `ConstDependency` family — and `helpers/` for the parse-time helpers two or more families read; a family owning a set of dependencies gets its own directory: `amd/` (with the `LocalModule` a named `define` records, `RequireJsStuffPlugin`, and the generically named `UnsupportedDependency`, which only AMD emits), `commonjs/` (with `require.resolve`, `require.ensure`, `require.include` and `ModuleDecoratorDependency`), `context/`, `css/`, `esm/` (with `TopLevelAwaitDependency`), `html/`, `hmr/`, `import/`, `import-meta/`, `system/`, `url/` (`new URL(asset, import.meta.url)`, with the `URLParserPlugin` that reads it and the `ImportMetaResolveDependency` extending its base), `wasm/`, `worker/` (with the `CreateScriptUrlDependency` only it constructs). Two group by what a request asks for rather than by syntax: `context/` (the `ContextDependency` base every family's context variant extends, plus `require.context`, `import.meta.webpackContext` and the glob form) and `hmr/` (the `module.hot` and `import.meta.webpackHot` accept/decline pairs). What decides the directory is which plugin applies it, not the language it names: `CreateRequireParserPlugin` reads a CommonJS `require` out of an ESM module, so it sits in `esm/`, because `ESMModulesPlugin` applies it. `import.meta` is `import-meta/`, not `esm/`, for the same reason: `WebpackOptionsApply` applies `ImportMetaPlugin` unconditionally and it taps `javascript/auto` as well as `javascript/esm`. That directory holds only what nothing else reads — `ImportMetaMainDependency` and the generically named `BuildTimeConstDependency`; its context, hot and resolve dependencies follow their own applier into `context/`, `hmr/` and `url/`, and `lib/node/`, `lib/hmr/`, `esm/`, `url/` and `worker/` read its hooks from outside. `import()` sits in `import/`, not `esm/`, on the same evidence: `ImportPlugin` is applied by `WebpackOptionsApply` and taps `javascript/dynamic` too, since the expression is legal in a script. Its `ImportPhase` enum is `core/`, read by `graph/`, `optimize/`, `externals/` and more. A dependency a single feature owns is not here at all but with that feature, by the same rule: `LoaderDependency` in `lib/loaders/`, `JsonExportsDependency` in `lib/json/`, `DllEntryDependency` in `lib/dll/`, the `ExternalModule*` three in `lib/node/`, `EntryDependency` in `lib/entry/`, `PrefetchDependency` in `lib/prefetch/`, `ProvidedDependency` in `lib/provide/`, `PureExpressionDependency` in `lib/optimize/`, and `ExportsInfoDependency` and `WebpackIsIncludedDependency` in `lib/javascript/`. A class leaving this root moves its `makeSerializable` request with it and holds the old one open with `registerLegacyRequest`, or a pre-move cache pack stops loading — one that moved twice keeps a registration per old request, which is why the `esm/` classes carry both an `ESM` and a `Harmony` one. `ContextElementDependency`, `NullDependency` and `ConstDependency` also keep a re-export at their old path, the three moved paths a published webpack 5 package imports.
  - `lib/devtool/` — source maps: the `devtool` plugins and their filename helpers.
  - `lib/diagnostics/` — plugins raising a build-wide error/warning of their own (case-insensitive filesystem collision, deprecated option, missing `mode`), `IgnoreWarningsPlugin` (filters them) and `NoEmitOnErrorsPlugin` (reacts to errors). Their classes live in `lib/errors/`; `performance` hints in `lib/performance/`.
  - `lib/dll/` — DllPlugin / DllReferencePlugin, and the two dependencies they own, `DllEntryDependency` and `DelegatedSourceDependency`.
  - `lib/deno/`, `lib/electron/`, `lib/node/`, `lib/web/`, `lib/webworker/` — target-specific runtime templates and externals presets. `lib/node/` also holds the three `ExternalModule*` dependencies, which only `NodeStuffPlugin` applies: they import a host module inline (`fileURLToPath` from `node:url` for `__dirname`) and are unrelated to `lib/externals/ExternalModule`, despite the name.
  - `lib/entry/` — the `entry` option: `EntryPlugin` with the `EntryDependency` it builds one from, `EntryOptionPlugin` (reads the option into it), `DynamicEntryPlugin` (function entry). `Entrypoint` is a `ChunkGroup` → `lib/graph/`.
  - `lib/errors/` — error and warning class hierarchy.
  - `lib/esm/` — ESM-specific output (e.g. `import.meta`).
  - `lib/externals/` — the `externals` option's module, factory plugin and presets.
  - `lib/fs/` — the filesystem webpack reads/writes through: `fs.js` declares the `InputFileSystem`/`OutputFileSystem` surface callers are typed against, plus path helpers; `FileSystemInfo` records the snapshots, timestamps and build dependencies watch and cache judge staleness from. `StackedCacheMap` is here for the same reason: `FileSystemInfo` alone keeps its timestamps in one, and it trades `delete`/`has` away to add whole maps at once. A target-supplied filesystem stays with its target (`NodeWatchFileSystem` in `lib/node/`). `lib/FileSystemInfo` stays a re-export (html-webpack-plugin types against it).
  - `lib/graph/` — the module and chunk graphs and the base classes every build has: `ModuleGraph` + connections, `ChunkGraph` + `buildChunkGraph`, `ExportsInfo` (what each module exports, who uses it); edges are `Dependency`, held by `DependenciesBlock` (`AsyncDependenciesBlock` when loaded on demand); chunk side `Chunk`, `ChunkGroup`, `Entrypoint`, `HotUpdateChunk`. A plugin's `Dependency` subclass → `lib/dependencies/`, its template → `lib/template/`.
  - `lib/hmr/` — Hot Module Replacement: `HotModuleReplacementPlugin` and its runtime modules, lazy-compilation backend and helpers.
  - `lib/html/` — experimental HTML. `syntax.js` mirrors `css`: `syntax-parser.js` (tokenizer, §13.2 tree construction, entity table) and `syntax-printer.js` behind getters; it publishes those two plus `SourceProcessor` only. `builtinEmbeddedRenderer` hands each embedded body to webpack's own minifier for its language.
  - `lib/ids/` — module/chunk id plugins, and `RecordIdsPlugin` (persists ids across builds via `recordsPath`).
  - `lib/javascript/` — JS parsing (webpack's own parser, ported from acorn), generation, exports analysis, and the always-on, non-public plugins `WebpackOptionsApply` applies unconditionally: `APIPlugin` (`__webpack_require__` and other free variables), `CompatibilityPlugin`, `ConstPlugin`, `ExportsInfoApiPlugin`, `JavascriptMetaInfoPlugin`, `UseStrictPlugin`, `WebpackIsIncludedPlugin` — the `ExportsInfoDependency` and `WebpackIsIncludedDependency` the third and last of those own live here too. `StackedMap` is here too — only the parser's scope chain stacks definitions that way. Who applies a plugin decides its home, not which parser it taps — user-constructed ones live in `lib/define/` and `lib/provide/`.
    - `syntax.js` reaches `parser` and `printer` through getters: parsing never loads the printer, and the printer loads the parser only for its `parse` phase.
    - `syntax-parser.js` — tokenizer, acorn-derived core and every production in one file (any parse reaches the productions, and the coming struct-of-arrays rewrite moves node creation through them). `regexp.js` (pattern validator) is the one on-demand piece, reached only for a pattern the host engine rejected — never `require` it from a build path.
    - `syntax-printer.js` — prints JS back out. `jsMinify.js` (the `minify` the default minimizer dispatches JS to) goes through it when given `printer: true` — which `optimization.minimizeOptions.javascript` defaults to under `experiments.futureDefaults` — and through terser as published otherwise. Its loader reads terser's own sources rather than the published entry, which lets a phase webpack implements replace terser's method. Each phase taken over is one less thing terser does. A phase states what it reads with `supports`; a minifier that moved any of it, or a runtime that can't import those sources, keeps its own. Add phases to the `PHASES` list there and nowhere else, each writing byte-for-byte what it replaced. Its `parse` phase builds terser's tree from `syntax-parser.js` (`createTerserTree`), leaving to terser's parser a source terser reads unlike the spec; `syntax-printer-parse.unittest.js` holds it to terser's parse over acorn's corpus.
  - `lib/json/` — JSON modules, with the `JsonExportsDependency` naming what one exports, and `jsonMinify`, which strips the whitespace between a JSON asset's tokens for the default minimizer.
  - `lib/library/` — UMD/AMD/ESM/CommonJS library formats, and the deprecated `LibraryTemplatePlugin` (old two-argument API).
  - `lib/loaders/` — loader execution (vendored loader-runner): pitching/normal iteration and loader loading, plus `LoaderOptionsPlugin` and `LoaderTargetPlugin`, which feed the loader context, and `LoaderPlugin` with the `LoaderDependency`/`LoaderImportDependency` it builds a loader's own imports from.
  - `lib/logging/` — Logger API, console formatting, and `ProgressPlugin` (reports through it). `lib/ProgressPlugin` stays a re-export (webpack-stream requires it).
  - `lib/module/` — what a module is and what makes one: `Module`, `NormalModule`, the factories (`NormalModuleFactory`, `NullFactory`, `SelfModuleFactory`), base `Parser`/`Generator`, `CodeGenerationResults`, `ModuleProfile`, and the two constants files naming module and source types. A plugin's module subclass lives with the plugin (`ExternalModule` → `lib/externals/`, `CssModule` → `lib/css/`).
  - `lib/optimize/` — optimization plugins (`SplitChunksPlugin`, `ConcatenatedModule`, …), `CircularModulesPlugin` (flags import cycles), `LazyBarrel` (finds barrel files worth deferring) and the `PureExpressionDependency` only `InnerGraphPlugin` emits. The three data structures each of one plugin reads are here, not in `lib/util/`: `Queue` (`FlagDependencyExportsPlugin`), `TupleQueue` (`FlagDependencyUsagePlugin`) and `LazyBucketSortedSet` (`LimitChunkCountPlugin`). `ConcatenationScope` is scope hoisting's protocol: only `ConcatenatedModule` constructs one; any generator renders through it.
  - `lib/output/` — plugins shaping the set of files written to `output.path` (not the modules in them): `CopyPlugin` adds (`output.copy`), `CleanPlugin` prunes (`output.clean`), `BannerPlugin` rewrites an asset, `ManifestPlugin` describes the rest, and `SSRManifestPlugin` emits which client files each source module needs, so an SSR response can name the stylesheet of a route not yet requested. How names and formats are decided is `lib/template/`, `lib/library/`, `lib/devtool/`.
  - `lib/performance/` — asset/entrypoint size hints.
  - `lib/prefetch/` — two mechanisms sharing a word: runtime modules emitting `<link rel="prefetch">` for a chunk, and `PrefetchPlugin`/`AutomaticPrefetchPlugin`, which resolve a module eagerly at build time through the `PrefetchDependency` they own.
  - `lib/provide/` — `ProvidePlugin` and its `ProvidedDependency`: free identifier → import of a module (not a value, so not `lib/define/`; user-constructed, so not `lib/javascript/`).
  - `lib/resolve/` — request → file: `ResolverFactory`, and `IgnorePlugin` / `NormalModuleReplacementPlugin`, which redirect a request before it.
  - `lib/rules/` — `module.rules` matching engine.
  - `lib/runtime/` — runtime modules emitted into bundles (chunk loaders, public-path, …), their `RuntimeModule` base, the `RuntimeGlobals` symbols, and `RuntimePlugin` (injects them for the collected requirements).
  - `lib/schemes/` — URL scheme handlers (`data:`, `http:`, …).
  - `lib/serialization/` — persistent cache serialization.
  - `lib/sharing/` — shared modules / Module Federation runtime.
  - `lib/stats/` — `Stats`/`MultiStats` and their default printer and JSON factories.
  - `lib/template/` — source templates and init fragments generators print through: `RuntimeTemplate` (the printing helper every generator and dependency template gets), the `DependencyTemplate` base, and `ModuleInfoHeaderPlugin` (per-module comment header).
  - `lib/typescript/` — experimental TypeScript modules (types stripped via Node's TypeScript API).
  - `lib/util/` — helpers no one subsystem owns (a data structure, an algorithm, something several directories share): e.g. `dataURL` (reads/writes `data:` URLs; helpers a minifier drives a caller's `renderEmbeddedSource` through), `RequestShortener` (context-relative requests in user-facing messages), `terminalColors` (color detection and escape wrappers for all terminal output — `ProgressPlugin`, `nodeConsole`, webpack-cli via `webpack.cli`). A helper only one subsystem uses lives there (`semver` → `lib/sharing/`, `numberHash` → `lib/ids/`, `deterministicGrouping` → `lib/optimize/`), so a directory's contents show what it is made of.
  - `lib/wasm/` — WebAssembly's async path, plus `EnableWasmLoadingPlugin` and `wasmModuleFilename`, which neither path owns. Both paths' dependencies are `lib/dependencies/wasm/`, since they share `WebAssemblyImportDependency`.
  - `lib/wasm-sync/` — the sync WebAssembly path, kept apart until the next major release removes it.
  - `lib/watch/` — watch mode: the watching handles a compiler returns, and `WatchIgnorePlugin`.
- `hot/` — browser-side HMR runtime (not Node tooling).
- `bin/` — `webpack` CLI entry point.
- `tooling/` — repo-internal scripts:
  - Codegen run by `yarn fix:special`: runtime/wasm generators, the hash-debug tool, and `generate-types.js` — the one entry point and file for everything derived from `schemas/**/*.json`. It reads each schema once, emits its declaration and precompiled validator, then `types.d.ts`, so ordering is internal and one check run names every stale output.
  - `compare-css-tools.js` / `compare-html-tools.js` / `compare-js-tools.js` (`yarn benchmark:css-tools` / `:html-tools` / `:js-tools`, sharing `compare-tools-harness.js`) — no arguments or source reading needed. Each runs webpack's implementation for the language and ecosystem equivalents over popular framework stylesheets, real documents and shipped JS bundles.
    - **Three tables per fixture**: parse only, parse + readable print (`beautify`), parse + minified print (`minify`) — separating parse cost from printing/transform cost. Each shows best-of-3 wall and cpu ms and the worker's peak RSS, every tool × fixture in its own process; RSS comes from `/proc/self/status`, since Linux carries `maxRSS` across `fork`+`exec` and a worker asking for its own gets the parent's. **Read wall and cpu together**: cpu above wall = more than one core (V8 background threads, a native pool); below = waiting. A tool working in its own service process says so in its name and shows `-` for cpu and peak (esbuild today).
    - Printing tables add output size raw and gzip/brotli/zstd (`test:size` settings), whether the output lost classes / changed the DOM / stopped naming a property ("rejects it" = the tool errored), and `2nd`: what printing the output again moved — the idempotence question asked of every tool (`-` is a printer done printing). A round-trip printer that reformats nothing (postcss for CSS, parse5 for HTML) sits in `beautify` as the floor.
    - JS owns a parser but no printer yet: webpack's parse row is its own parser, its printing rows are `lib/javascript/jsMinify.js` (the build's minify entry, printing through terser today), so a phase taken over is read against what it replaced in the same table. `webpack (2 passes)` uses `optimization.minimize`'s default options, so it isn't like for like with terser's default row. The parse table's last column compares each ESTree parser to acorn's tree and names the first differing node; with the `spans` relation this catches a divergence in `lib/javascript/syntax-parser.js` (one reads the tree, the other the offsets — a range can be wrong while every node agrees). A parser with a dialect of its own reads `own dialect`, not a disagreement.
    - `FIXTURE=`, `TOOL=`, `STAGE=` narrow the rows.
    - **Corpora** are declared in `tooling/comparison/<cache name>/`: a `package.json` pinning every package exactly and a `package-lock.json` freezing the resolution, transitive deps included, so a sweep runs what was committed rather than what the registry serves that day, and a finding names a reproducible corpus. `installPackages` runs `npm ci` into `node_modules/.cache/<cache name>/` (not webpack's deps) on first run, skipped while the lockfile it last installed from matches; expect ~a minute of install first, and 10+ minutes per full run. Bump a corpus by editing its manifest, never the script. Dependabot watches the three directories, so a bump arrives as its own PR — where a break is attributable, not on somebody else's — and there the `invariants` job — which installs and sweeps all three — reds on a broken printer invariant, an `npm ci`-refused manifest/lockfile, or a platform package the lockfile misses (`yarn benchmark:<language>-tools:setup` is the install alone). Each corpus keeps an `.npmrc` with `package-lock=true`: Dependabot reads npm config from parent directories (npm doesn't), so otherwise the root's `package-lock=false` (right for yarn's tree) leaves a bump's lockfile unregenerated — exactly what `npm ci` refuses.
    - **Invariants.** Each comparison first holds webpack's implementation to five relations over its own input — `test/**/*.css` / `*.html` / `*.js`, its own fixtures, whatever the cache holds — in seconds, before any install. `--invariants` runs only that and exits non-zero on any finding; the `invariants` job gates every PR on it (`yarn test:invariants`, or `:css` / `:html` / `:js`). A relation is cheap to hold, so a regression fails rather than reports. `FIXTURE=`, `RELATION=`, `PRESET=`, `SPELLING=` narrow a run.
      1. Printer, idempotence: minifying already-minified output changes nothing, under every option set the webpack rows use — plus, for CSS, a pinned pre-nesting target, since a modern one never runs the lowerings. **Also asked of each source cut short** — inside and just after one token of each kind (CSS) or inside each construct (HTML): the end of input is where the tokenizer and parser close what the source left open, and a printer writing after it (a rule's `}`, a document's `</body>`) must close it too, or the next pass reads that inside it. A CSS cut keeps only the first small-enough top-level construct it falls in, so the cuts cost seconds. They are why a value written as it stands is closed where a `}` follows it and left open in a `style=""`, where nothing does and Chromium keeps it open.
      2. Printer, spelling: how a value was spelled doesn't decide what it minifies to, under the first option set (the question is the same under each; each asking is a full minify). **A respelling may only rewrite what the spec calls equivalent**: HTML — a delimiter, a character reference, name case; CSS — an escape (§4.3.7), a string's delimiter, a leading zero, unit and at-rule-name case. Identifiers are never case-respelled: which kind one is depends on position, and class, id, custom property, font family and counter name are case-sensitive. A custom property's value is skipped whole (`var()` substitutes it elsewhere and the spec keeps it as authored) — the one region where spelling decides output on purpose, as a tag another language writes into is skipped in HTML. **Outputs are compared by meaning, not bytes**, through a stream resolving each token's value (`8PX` ≡ `8px`, `"a"` ≡ `'a'`); a shorter-or-equal output saying the same isn't a finding, a longer one is. HTML respellings are lexical and checked against webpack's tokenizer first, dropping any that moved the document; whitespace inside a tag isn't one (a tag nothing beats is echoed as written), and a tag another language writes into is skipped whole (`=""` on `{% endif %}` restates nothing). Each finding is bisected to what carries it, re-run on the enclosing tag alone to name a repro, and grouped by it — one defect reaches hundreds of pages. (`method=GET` folding only where quoted, fixed in #22095, was found this way.)
      3. Parser, `spans`: every node's range against its source — nothing inverted or past the end, a node inside its holder, siblings not overlapping, every sub-range (CSS declaration name and block, HTML opening tag, each attribute) inside the node. **The exclusions are the specs, not slack**: CSS owes all of it. HTML owes neither containment nor sibling non-overlap — §13.2 ends an element at its start tag until an end tag is read (`<html>` omitting `</html>` ends before its `<body>`) and closes an open element at the next tag (`<p>a<p>b` shares bytes); asking reports 4031 and 22 findings, none a defect. JS owes containment but not sibling non-overlap (ESTree aliases a shorthand property's key and value over one range).
      4. Parser, `slices`: the bytes between a node's offsets, parsed alone, give the node back. **A slice is parsed in a context keeping its meaning, never at top level** (`yield x` is an identifier outside a generator; a lone `<td>x</td>` is dropped and its text foster-parented): CSS wraps a declaration in a rule and a value in a declaration; JS tries a ladder of function and class-method contexts under the source's own `ecmaVersion` (`function*(){}` can't open a statement; an ES6-pinned case can't parse `async function*`); HTML runs the fragment parsing algorithm on the enclosing tag, as browsers do for `innerHTML`. A node no context parses is counted, not reported. Left out (§13.2 again): an element the parser inserted or cloned (no tag to slice), and one whose end is still its start tag's (its range doesn't hold its children). **Two limits keep it to seconds**: one shape is one question (a bundle's millionth `Identifier[0,3)` is skipped — CSS went 30s → 4.6s), and each source may spend at most four times its bytes on reparsing, leaves first; both skip counts are reported, as unread coverage. The JS sweep also reads `fixtures/acorn-corpus.json` under each case's options, reaching productions no fixture writes; sources the parser refuses are counted, not reported (those cases assert the refusal).
      5. Parser, `purity`: rereading the same bytes in one process gives the same answer. **Every source is read once before any is read again**, so every other source sits between a source's two readings — catching a cache keyed on the last input. **The digest holds what the parse derived, not only offsets** (`parseHtml` interns tag and attribute names as slices of the document first spelling them and drops those on the next parse, so a stale name keeps correct offsets): HTML tag/attribute names and values, CSS derived names, and every primitive on a JS node, read off the node's own keys so new productions are covered; CSS and HTML also digest the printed bytes. Refusals are digested too, except running out of stack (its position depends on the surrounding call depth). A disagreeing source is read a third time back to back, telling leaked state from a non-repeatable parse.
      - Relations 3–5 are the parser's and run under no option set. A parser that also prints is held to both halves; JS printing is terser's today, so its printer relations aren't asked yet. These catch what a comparison can't: being a few bytes off one's own best isn't being worse than another tool.
      - A divergence the printer owes nothing for goes in the script's `EXPECTED` table with its reason, never suppressed by a passing gate; an entry that stops matching is itself a finding, so a fix retires it.
      - The HTML sweep adds a third option set, `embedded` (the aggressive one + `builtinEmbeddedRenderer`) — what a build runs, so inline `<style>` and `style=""` reach the CSS minifier and both printers are checked as one. It caught a recovered CSS string keeping the quote its source opened with, which `.css` suites can't reach (a css module ends declarations with a newline, making an open string a bad-string).
  - `type-coverage.js` (`yarn types:cover`) — how much of `lib/` is precisely typed.
  - `find-deep-webpack-imports.js` (`yarn find-deep-imports`) — which `webpack/lib/…` paths published packages import directly. It ranks the most downloaded `webpack`, `webpack-plugin` and `webpack-loader` packages via the registry search endpoint (which carries weekly downloads, so `api.npmjs.org` is never needed) and reads each tarball rather than installing it, so no stranger's lifecycle script runs. A path counts only where imported, never as a bare string (a package bundling webpack carries its `makeSerializable` requests but imports none). Results live in `tooling/deep-webpack-imports.json` (`--write` refreshes); its `removed` map names paths no webpack 5 build can reach, with the reason — deleted with the webpack 4 API, imported only by a webpack-4-only package, or probed in a `try` to detect webpack 4 (a re-export would pick the wrong branch) — so only a genuine break fails. `--check` reads only that record (no network, no install): the `Deep Imports` job runs it on every PR in under a second, fails, and comments what broke with the importing packages and their downloads, retracting the comment once the paths resolve. `test/unitCases/deepPathShims.unittest.js` asserts the same off the same record, so a move learns it owes a re-export from a test rather than a bug report. `COUNT=` sets packages per keyword (default 200); a package in two keywords is scanned once; tarballs cache under `node_modules/.cache/`, so a re-run costs nothing. Only collecting needs the network.
  - `measure-color-agreement.js` (`yarn measure:color-agreement`) — asks a real browser for its own color conversions (not pixels) and prints how far webpack's sit from them; it is the source of the rounding margins in `lib/css/syntax-parser.js` and the list of spaces an engine reads through another transfer. Re-run it (seconds; `PUPPETEER_EXECUTABLE_PATH` picks the binary) rather than adjusting either by hand.
  - `retry.js` — reruns a failing setup command so a registry 503 or dropped browser download reds no job. Every network-reaching command in `.github/workflows/` (installs, `yarn upgrade`, Firefox/WebKit downloads, `git submodule update` fetches) runs as `node tooling/retry.js <command>`, tuned by `RETRY_ATTEMPTS` (3) and `RETRY_DELAY` (5000ms). A value that isn't a positive integer / non-negative number is refused, not defaulted (one reaching the loop as `NaN` retried until the job timed out). Node builtins only — callers run before `yarn install`.
- `assembly/` — WebAssembly source for the hash function.
- `setup/` — one-time setup; `setup.js` (`yarn setup`) is the only entry point and safe to re-run. A contributor at a terminal gets the interactive path (installs yarn if missing, links through yarn's registry); everything else gets the non-interactive one (verifies the lockfile instead of rewriting it, installs no global yarn, links the checkout as `node_modules/webpack` without touching yarn's machine-global registry). It decides from both streams being a TTY with `CI` unset — never a vendor-variable list, so an unknown agent takes the safe path. An agent allocating a PTY reads as a contributor and should set `WEBPACK_SETUP=automated` (`interactive` forces the other path).

**Schemas (source of truth for the config API)**

- `schemas/WebpackOptions.json` — top-level options.
- `schemas/plugins/*.json` — per-plugin options (`BannerPlugin`, `IgnorePlugin`, `ProgressPlugin`, `SourceMapDevToolPlugin`, …).
- `schemas/_container.json`, `schemas/_sharing.json` — Module Federation sub-schemas.

**Tests** — structure, naming and running one case: [TESTING_DOCS.md](TESTING_DOCS.md).

- `test/` — all suites (`unitCases/`, `cases/`, `configCases/`, `specCases/`, `watchCases/`, `hotCases/`, `statsCases/`, `typesCases/`, `benchmarkCases/`, `memoryLimitCases/`, …).
  - `templates/` — suite drivers (`TestCases.js`, `ConfigTestCases.js`, `HotTestCases.js`, `WatchTestCases.js`); the top-level `*.test.js` / `*.basictest.js` / `*.longtest.js` are thin shims over them. Each exports `describeCases(config)` and resolves case directories against `test/`, never its own. The shims' option sets live together in `templates/variants.js` (re-exported as `variants`) so suite differences read side by side; there's one shim per entry because jest parallelizes per file, not per describe.
  - `harness/` — what runs the suites: jest lifecycle (`globalSetup.js`, `globalTeardown.js`, `setupTestFramework.js`), the `patch-node-env.js` environment, the crash reporter, the case `runner/`, the `snapshot/` resolver, and `runtimes/` (preload/setup files for Bun and Deno). Reusable assertions and fixtures go in `helpers/`.
  - `RoundTripConfigCases` re-bundles the output of `configCases` that have a `roundTrip.js`.
  - `external/` — what webpack doesn't maintain: every git submodule (today the four spec corpora below) — upstream's to change, ours only to pin. `external/wpt/` (web-platform-tests), checked out one commit deep by `parser (html)` and `syntax-equivalence`, holds the HTML tree-construction corpus since html5lib-tests dropped it.
  - `fixtures/acorn-corpus.json` — acorn's test suite — the one upstream corpus vendored rather than pinned, because acorn's npm tarball ships no tests. `unitCases/WebpackParser.unittest.js` holds both webpack parser entry points to it and owns recording it (no generator script or `package.json` entry): it replays acorn's `test/tests*.js` against a recording driver, keeping sources and options but never expected trees, which come from acorn itself. Bumping the `acorn` devDependency moves the corpus; to refresh, clone acorn at the new version into `node_modules/.cache/acorn-<version>` and re-run with `WEBPACK_UPDATE_ACORN_CORPUS=1`. With that checkout present the run checks the vendored corpus against it; without it (CI, most machines) the corpus stands on the version it names, which the run pins to the installed acorn.

**Git submodules** — all under `test/external/`, checked out on demand: `yarn setup` doesn't fetch them, and each CI job fetches only its own, one commit deep.

- `test/external/test262-cases` — [tc39/test262](https://github.com/tc39/test262); fetched by `test262`, `parser (js)`
- `test/external/html5lib-tests` — [html5lib/html5lib-tests](https://github.com/html5lib/html5lib-tests); fetched by `parser (html)`
- `test/external/wpt` — [web-platform-tests/wpt](https://github.com/web-platform-tests/wpt); fetched by `parser (html)`, `syntax-equivalence` (browsers)
- `test/external/css-parsing-tests` — [CourtBouillon/css-parsing-tests](https://github.com/CourtBouillon/css-parsing-tests); fetched by `parser (css)`

```sh
git submodule update --init --recursive --depth 1   # check out the commits the repo pins
git submodule update --init --recursive --remote --depth 1 # move every pin to its upstream tip
```

Keep `--depth 1` (`wpt` alone is ~161k files). `--remote` changes the recorded commits, so `git status` shows the four paths modified — commit that only once CI is green on them, or `git submodule update` back to the pins.

**Examples & changesets**

- `examples/` — usage examples (`yarn build:examples`).
- `.changeset/` — pending changesets for the next release.

**Hand-maintained type declarations (editable)** — `declarations.d.ts`, `declarations.test.d.ts`, `module.d.ts`. The loader context is not one of them: `LoaderContext` and the loader-definition types are JSDoc in `lib/`, declared where the code adding each part lives (`lib/module/NormalModule.js`, `lib/loaders/LoaderRunner.js`, `lib/loaders/LoaderPlugin.js`, `lib/hmr/HotModuleReplacementPlugin.js`) and re-exported from `lib/index.js`, the file `generate-types.js` reads the public type surface from.

**Configuration**

- `package.json` — all commands (`scripts`).
- `tsconfig*.json` — one per surface: `lib`, `hot`, types tests, validation, benchmarks.
- `eslint.config.mjs`, `cspell.json`, `jest.config.js`, `generate-types-config.js` — lint/spell/test/type-gen configs.
- `.github/workflows/`, `.github/scripts/` — CI.
- `test/patches/` — test-only dependency patches (e.g. jest-worker), `git apply`'d in the CI Bun job.

**Adding or renaming a webpack option** touches every layer, in order — skipping one silently breaks the option:

1. **Schema** — `schemas/WebpackOptions.json` (or `schemas/plugins/<Name>.json`).
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

**Schema documentation keywords** become JSDoc tags in the generated declarations:

- `"added": "<version>"` → `@since`: the first webpack version shipping the option. An unreleased option gets the upcoming version (`package.json` version with pending changesets applied — on `5.108.x` with minor changesets pending, `"added": "5.109.0"`).
- `"experimental": true` → `@experimental`, for `experiments` options or others subject to breaking changes.

They are documentation only (stripped from precompiled validators). A pure `$ref` property can't carry them — annotate the referenced definition.

**What a schema may say is the lint rule's job, not the generator's.** `webpack/valid-schema` rejects extra keys beside a `$ref`, any `minLength` but `1`, and an `enum` holding non-primitives (the validator emits no other length check and compares nothing else); `yarn lint:code` reports them at the key, and the generator assumes they hold.

**`normalization.js`** canonicalizes the user's config shape (shorthand → full form); **`defaults.js`** fills values (often mode/target-dependent). Edit whichever matches.

**New dependency type:** pair the `Dependency` subclass with a `DependencyTemplate` (emits the code), register the class with `makeSerializable(...)`, and wire the template into `compilation.dependencyTemplates`.

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
5. `makeSerializable(Class, "webpack/lib/…")` — the request moves with the class and the old one stays restorable via `registerLegacyRequest`, or pre-move cache packs stop loading.
6. A path in a config or generator outside `lib/` — the input list in `tooling/generate-runtime-code.js`, an `ignores` entry in `eslint.config.mjs`. Both silently stop matching; the second fails as style errors in a file nobody edited.

`yarn fix:special` leaving `types.d.ts` byte-identical confirms 3 and 4; `ConfigCacheTestCases` reporting no `Pack got invalid` line confirms 5; nothing static catches 1 — only building `lib/index.js` does.

This applies equally to moves **between** `lib/` directories, where 6 is what has actually gone wrong (`lib/util/semver.js` was named in both files above).

**Update the Architecture listing in the same commit**, and grep this guide for the old path — prose elsewhere names files too.

### Diagnostics and hints

> [!REQUIRED]

**Error and warning classes live in `lib/errors/`**, whatever raises them; the raising plugin stays where it belongs.

A hint reuses existing reporting: `SizeLimitsPlugin` and `DuplicatePackagesPlugin` both end in `hints === "error" ? compilation.errors : compilation.warnings`; hardcoding one list makes a hint impossible to escalate. Prefer an option saying _whether_ to run the check and leave severity to `performance.hints`.

**`makeSerializable` follows from where a diagnostic is created.** Anything reachable from a module (`ModuleError`, `ModuleWarning`, `ModuleBuildError`) is serialized with the module graph and must register. One built after seal and pushed onto `compilation.warnings` never enters the pack (why nothing in `lib/performance/` registers). A wrong guess is silent except for `Pack got invalid because of write to:` under `ConfigCacheTestCases`, so cover a new diagnostic there.

## Code conventions

### Source language: CommonJS + JSDoc

`lib/` is CommonJS only: `module.exports` / `require()`, never `import`/`export`. Types are JSDoc (`@typedef {import("./Other")} Other` etc.), never TypeScript syntax in `.js` files; `yarn fix:special` compiles them into `types.d.ts`.

### Type annotations

Use the most specific real type. `EXPECTED_ANY`, `EXPECTED_OBJECT`, `EXPECTED_FUNCTION` (aliases for `any`, `object`, `Function`) are an escape hatch **only** for a value that genuinely can be any value/object/function — never when a real type fits. Likewise `unknown` is for a type you can't yet name (then narrow); prefer a real type such as `import("…").Foo`. Applies in `test/` too.

When a function's output type depends on its input, use a generic (`@template`) rather than widening, so callers stay precisely typed.

### Naming

Spell names out in full (functions, variables, parameters, properties): `insertHtmlElement` not `insHtmlEl`, `attributeCount` not `attrCnt`, `current` not `cur`, `element` not `el`. Exceptions: abbreviations webpack already uses pervasively (`ast`, `ns`, `id`, `url`, `css`, `js`, `dir`, `env`, `fs`) or spec-defined ones (`afe` — the HTML spec's active formatting elements), and throwaway loop indices (`i`, `j`, `k`). Otherwise write the full word.

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

Perf/memory claims need evidence, and the cheap kinds are the trustworthy ones; prefer, in order:

1. **Counting** — calls, allocations, retained objects. Deterministic; run once.
2. **CPU-profile attribution** — `node --cpu-prof`, sum self time per bucket. Robust to load.
3. **Retained heap** — `node --expose-gc`, GC several times, read `v8.getHeapStatistics().used_heap_size`.
4. **Wall/CPU timing** — last resort: interleave arms in one process, report `n` and dispersion; a difference below run-to-run spread is no result.

`FILTER="<case-name>" yarn benchmark` drives the repo's cases; fixtures are in `test/benchmarkCases/`.

**Some hot methods are sized to V8's inlining budget.** TurboFan won't inline a callee over its bytecode limit (460 at the time of writing), so adding anything to a method just under it silently loses the inlining. `lib/javascript/syntax-parser.js` keeps `readWord`, `readString` and `finishToken` under it deliberately, with rare arms split into `_readWordIntoCache`, `_readWordUncacheable`, `_readStringCold` and `_updateContext`; `readWord` has ~6 bytes of headroom and once cost 1.4% from one added argument. Check the size before and after touching them:

```sh
node --print-bytecode --print-bytecode-filter=readWord <script that parses something>
```

`node --trace-turbo-inlining` shows what was inlined where and reports `Cannot consider <name> for inlining (reason: 5)` for a too-large callee.

**Instruction counts and time are different claims** — say which a number is. Callgrind over a warmed parse (`valgrind --tool=callgrind --smc-check=all-non-file`, differencing two run lengths so startup and tier-up drop out) resolves work to ~±0.2% and answers "does this do less", not "is the build faster": CPU time on a shared machine needs tens of fresh processes per arm to resolve a few percent, and allocation changes move GC timing in steps that swamp the mutator delta.

Claims about **webpack's CSS/HTML minifier or JS parser vs the ecosystem** (size, speed, memory, safety): run `yarn benchmark:css-tools` / `:html-tools` / `:js-tools` and read the tables (see `tooling/` in [Architecture](#architecture)) instead of hand-rolling a comparison.

Claims about **emitted size** are counted with `yarn test:size`: it builds every `configCases/` case with user defaults and reports each asset's raw/gzip/brotli/zstd size, so `lib/runtime/` or dependency-template changes show as bytes on the wire. Compare runs with `--baseline <report>`; the `Code Size` CI job compares against `main`'s last report and comments the diff on the PR.

**gzip decides; raw is only the tiebreak.** Compressed bytes cross the wire and gzip is the floor every client gets (brotli and zstd are subsets), so when compressed columns disagree the "no" wins and the change must earn its way in. Raw still buys decompress, parse and memory: compressed-neutral with less raw is worth taking; less raw but more gzip is not. The columns part along one seam, and knowing a change's side saves measuring it:

- **Removing information** (dead rule, duplicate declaration, a longhand its shorthand implies, whitespace, comments) normally shrinks all columns — no routine check needed, but read the compressed column for small removals, which can delete a run a later match pointed back to.
- **Re-encoding** (a shorter spelling) is where they diverge, because compressors reward repetition and a short novel token widens the literal alphabet. **A re-encoding must show a compressed win.** Both size-based refusals webpack ships are this shape: `output.environment.convertLengthUnits` (`16px` → `1pc`) is off by default for earning nothing compressed, and a string's hex escape stays as written because writing the character saves 6422 raw bytes but costs 595 gzip over the `benchmark:css-tools` fixtures (the same trade leaves a rival 3.8 KB smaller raw on Font Awesome but 0.3 KB bigger gzipped).

This is a review-time acceptance rule, not something a printer consults: no minifier runs a compressor in its inner loop, and ours must not either.

Pitfalls that produced wrong conclusions here:

- **Micro-benchmarks of one function lie** — V8's escape analysis deletes non-escaping allocations and the compilation cache hides repeated `new Function` cost. Measure inside a real build.
- **Changing async structure is not neutral** — adding `process.nextTick`/`setImmediate` or collapsing callbacks reorders module processing and drags order-dependent work along. Prove order unchanged before believing the delta.
- **Pick a fixture that emits** — `three-long` tree-shakes to 0 bytes in production, skipping codegen/render/minify and inflating any front-end phase's share. Corroborate on a case that emits.
- **Verify semantics every time** — module count, on-disk output hashes, and error/warning counts unchanged. Two empty outputs prove nothing.

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

**Never post to GitHub on your own initiative.** Pushing to your own branch is fine; publishing text others read is not — PR comments, review replies, issue comments, PR body edits after opening, and every reply to any bot.

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
- `declarations/**/*.d.ts` — per-schema/plugin declarations from `schemas/**/*.json`. Untracked: `generate-types.js` writes them every run, check mode included, since a fresh checkout has none.
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

- `schemas/**/*.json` — validators, declarations, `types.d.ts`.
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

- **Which files changed, by how much?** The per-asset table is the headline; no suite-wide total is reported (nothing actionable). Raw is what the generator wrote, compressed is what users download — read both; a raw saving with no gzip saving mostly moved entropy. [gzip decides](#verifying-a-performance-or-memory-change).
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
