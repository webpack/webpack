# Architecture

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps its rules and a pointer here. -->

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
  - `lib/dependencies/` — concrete `Dependency` subclasses and their templates, one directory per family (`core/`, `helpers/`, `amd/`, `commonjs/`, `context/`, `css/`, `esm/`, `html/`, `hmr/`, `import/`, `import-meta/`, `system/`, `url/`, `wasm/`, `worker/`); the base `Dependency` is in `lib/graph/`, `DependencyTemplate` in `lib/template/`. Which directory a class belongs in, and how a move keeps pre-move cache packs loading: [docs/dependencies.md](dependencies.md) — read it before adding or moving a dependency.
  - `lib/devtool/` — source maps: the `devtool` plugins and their filename helpers.
  - `lib/diagnostics/` — plugins raising a build-wide error/warning of their own (case-insensitive filesystem collision, deprecated option, missing `mode`), `IgnoreWarningsPlugin` (filters them) and `NoEmitOnErrorsPlugin` (reacts to errors). Their classes live in `lib/errors/`; `performance` hints in `lib/performance/`.
  - `lib/dll/` — DllPlugin / DllReferencePlugin, and the two dependencies they own, `DllEntryDependency` and `DelegatedSourceDependency`.
  - `lib/deno/`, `lib/electron/`, `lib/node/`, `lib/web/`, `lib/webworker/` — target-specific runtime templates and externals presets. `lib/node/` also holds the three `ExternalModule*` dependencies, which only `NodeStuffPlugin` applies: they import a host module inline (`fileURLToPath` from `node:url` for `__dirname`) and are unrelated to `lib/externals/ExternalModule`, despite the name.
  - `lib/entry/` — the `entry` option: `EntryPlugin` with the `EntryDependency` it builds one from, `EntryOptionPlugin` (reads the option into it), `DynamicEntryPlugin` (function entry). `Entrypoint` is a `ChunkGroup` → `lib/graph/`.
  - `lib/errors/` — every error and warning class, whatever raises them, and the helpers that shape them (`ErrorHelpers`, `deriveStackFromNestedError`). The raising plugin stays in its own directory and imports the class from here, so a diagnostic is found by kind rather than by which subsystem happened to emit it.
  - `lib/esm/` — ESM-specific output (e.g. `import.meta`).
  - `lib/externals/` — the `externals` option's module, factory plugin and presets.
  - `lib/fs/` — the filesystem webpack reads/writes through: `fs.js` declares the `InputFileSystem`/`OutputFileSystem` surface callers are typed against, plus path helpers; `FileSystemInfo` records the snapshots, timestamps and build dependencies watch and cache judge staleness from. `StackedCacheMap` is here for the same reason: `FileSystemInfo` alone keeps its timestamps in one, and it trades `delete`/`has` away to add whole maps at once. A target-supplied filesystem stays with its target (`NodeWatchFileSystem` in `lib/node/`). `lib/FileSystemInfo` stays a re-export (html-webpack-plugin types against it).
  - `lib/graph/` — the module and chunk graphs and the base classes every build has: `ModuleGraph` + connections, `ChunkGraph` + `buildChunkGraph`, `ExportsInfo` (what each module exports, who uses it); edges are `Dependency`, held by `DependenciesBlock` (`AsyncDependenciesBlock` when loaded on demand); chunk side `Chunk`, `ChunkGroup`, `Entrypoint`, `HotUpdateChunk`. A plugin's `Dependency` subclass → `lib/dependencies/`, its template → `lib/template/`.
  - `lib/hmr/` — Hot Module Replacement: `HotModuleReplacementPlugin` and its runtime modules, lazy-compilation backend and helpers.
  - `lib/html/` — experimental HTML. `syntax.js` mirrors `css`: `syntax-parser.js` (tokenizer, §13.2 tree construction, entity table) and `syntax-printer.js` behind getters; it publishes those two plus `SourceProcessor` only. `builtinEmbeddedRenderer` hands each embedded body to webpack's own minifier for its language.
  - `lib/ids/` — module/chunk id plugins, and `RecordIdsPlugin` (persists ids across builds via `recordsPath`).
  - `lib/javascript/` — JS parsing (webpack's own parser, ported from acorn), generation, exports analysis, and the always-on, non-public plugins `WebpackOptionsApply` applies unconditionally: `APIPlugin` (`__webpack_require__` and other free variables), `CompatibilityPlugin`, `ConstPlugin`, `ExportsInfoApiPlugin`, `JavascriptMetaInfoPlugin`, `UseStrictPlugin`, `WebpackIsIncludedPlugin` — the `ExportsInfoDependency` and `WebpackIsIncludedDependency` the third and last of those own live here too. `StackedMap` is here too — only the parser's scope chain stacks definitions that way. Who applies a plugin decides its home, not which parser it taps — user-constructed ones live in `lib/define/` and `lib/provide/`.
    - `syntax.js`, `syntax-parser.js`, `syntax-printer.js`, `jsMinify.js`'s phases and the minify-corpora gate: [docs/javascript.md](javascript.md) — read it before touching the JS parser, printer or minifier.
  - `lib/json/` — JSON modules, with the `JsonExportsDependency` naming what one exports, and `jsonMinify`, which strips the whitespace between a JSON asset's tokens for the default minimizer.
  - `lib/library/` — UMD/AMD/ESM/CommonJS library formats, and the deprecated `LibraryTemplatePlugin` (old two-argument API).
  - `lib/loaders/` — loader execution (vendored loader-runner): pitching/normal iteration and loader loading, plus `LoaderOptionsPlugin` and `LoaderTargetPlugin`, which feed the loader context, and `LoaderPlugin` with the `LoaderDependency`/`LoaderImportDependency` it builds a loader's own imports from.
  - `lib/logging/` — Logger API, console formatting, and `ProgressPlugin` (reports through it). `lib/ProgressPlugin` stays a re-export (webpack-stream requires it).
  - `lib/module/` — what a module is and what makes one: `Module`, `NormalModule`, the factories (`NormalModuleFactory`, `NullFactory`, `SelfModuleFactory`), base `Parser`/`Generator`, `CodeGenerationResults`, `ModuleProfile`, and the two constants files naming module and source types. A plugin's module subclass lives with the plugin (`ExternalModule` → `lib/externals/`, `CssModule` → `lib/css/`).
  - `lib/optimize/` — optimization plugins (`SplitChunksPlugin`, `ConcatenatedModule`, …), `CircularModulesPlugin` (flags import cycles), `LazyBarrels` (finds barrel files worth deferring) and the `PureExpressionDependency` only `InnerGraphPlugin` emits. The three data structures each of one plugin reads are here, not in `lib/util/`: `Queue` (`FlagDependencyExportsPlugin`), `TupleQueue` (`FlagDependencyUsagePlugin`) and `LazyBucketSortedSet` (`LimitChunkCountPlugin`). `ConcatenationScope` is scope hoisting's protocol: only `ConcatenatedModule` constructs one; any generator renders through it.
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
  - Codegen run by `yarn fix:special`: runtime/wasm generators, the hash-debug tool, `generate-schemas.js` — which derives each schema from the module declaring its options and reports what no longer derives — `precompile-schemas.js`, which compiles each schema into the standalone validator webpack validates with, and `generate-types.js`, which prints `types.d.ts` from the types the sources under `lib/` declare. Each names its own stale outputs.
  - `compare-css-tools.js` / `compare-html-tools.js` / `compare-js-tools.js` (`yarn benchmark:css-tools` / `:html-tools` / `:js-tools`) and the invariants gate every PR runs (`yarn test:invariants`) — how to read the tables, the pinned corpora and the five relations: [tooling/COMPARE_TOOLS.md](../tooling/COMPARE_TOOLS.md). Read it before claiming anything about webpack's CSS/HTML/JS implementation vs the ecosystem, or when `invariants` is red.
  - `type-coverage.js` (`yarn types:cover`) — how much of `lib/` is precisely typed.
  - `find-deep-webpack-imports.js` (`yarn find-deep-imports`) — which `webpack/lib/…` paths published packages import directly; `--check` (offline, run by the `Deep Imports` job) reads `tooling/deep-webpack-imports.json`. How it collects, and its `removed` map: [tooling/DEEP_IMPORTS.md](../tooling/DEEP_IMPORTS.md).
  - `measure-color-agreement.js` (`yarn measure:color-agreement`) — asks a real browser for its own color conversions (not pixels) and prints how far webpack's sit from them; it is the source of the rounding margins in `lib/css/syntax-parser.js` and the list of spaces an engine reads through another transfer. Re-run it (seconds; `PUPPETEER_EXECUTABLE_PATH` picks the binary) rather than adjusting either by hand.
  - `retry.js` — reruns a failing setup command so a registry 503 or dropped browser download reds no job. Every network-reaching command in `.github/workflows/` (installs, `yarn upgrade`, Firefox/WebKit downloads, `git submodule update` fetches) runs as `node tooling/retry.js <command>`, tuned by `RETRY_ATTEMPTS` (3) and `RETRY_DELAY` (5000ms). A value that isn't a positive integer / non-negative number is refused, not defaulted (one reaching the loop as `NaN` retried until the job timed out). Node builtins only — callers run before `yarn install`.
- `assembly/` — WebAssembly source for the hash function.
- `setup/` — one-time setup; `setup.js` (`yarn setup`) is the only entry point and safe to re-run. A contributor at a terminal gets the interactive path (installs yarn if missing, links through yarn's registry); everything else gets the non-interactive one (verifies the lockfile instead of rewriting it, installs no global yarn, links the checkout as `node_modules/webpack` without touching yarn's machine-global registry). It decides from both streams being a TTY with `CI` unset — never a vendor-variable list, so an unknown agent takes the safe path. An agent allocating a PTY reads as a contributor and should set `WEBPACK_SETUP=automated` (`interactive` forces the other path).

**The config API — declared as types, validated by JSON Schema**

Every schema is derived from the module declaring its options by `generate-schemas.js`; edit the declaration, not the schema. What JSON Schema states and a type has no syntax for travels as a JSDoc tag (`@minItems`, `@additionalProperties`, `@since`, `@tsType`, `@not`, …), and an alias names the constraints a plain type cannot carry where no JSDoc block can attach, on a union member (`NonEmptyString`, `AbsolutePath`, …), declared in the file that writes it.

- `lib/**/*.js` — **the source** for a plugin's options: JSDoc typedefs beside the code reading them, the root one tagged `@schema <path>` with the schema it derives. A module holds types of its own too, so only what that root reaches is the schema; one it reaches no other way says `@definition`.
- `declarations/WebpackOptions.ts` — **the source** for the configuration itself, and the only file left in `declarations/`. A definition of it that is also published as a schema of its own says `@publishes <path>`, and that schema is the reference.
- `schemas/WebpackOptions.json` — top-level options.
- `schemas/plugins/*.json` — per-plugin options (`BannerPlugin`, `IgnorePlugin`, `ProgressPlugin`, `SourceMapDevToolPlugin`, …).

**Tests** — structure, naming and running one case: [TESTING_DOCS.md](../TESTING_DOCS.md).

- `test/` — all suites (`unitCases/`, `cases/`, `configCases/`, `specCases/`, `watchCases/`, `hotCases/`, `statsCases/`, `typesCases/`, `benchmarkCases/`, `memoryLimitCases/`, …).
  - `templates/` — suite drivers (`TestCases.js`, `ConfigTestCases.js`, `HotTestCases.js`, `WatchTestCases.js`); the top-level `*.test.js` / `*.basictest.js` / `*.longtest.js` are thin shims over them. Each exports `describeCases(config)` and resolves case directories against `test/`, never its own. The shims' option sets live together in `templates/variants.js` (re-exported as `variants`) so suite differences read side by side; there's one shim per entry because jest parallelizes per file, not per describe.
  - `harness/` — what runs the suites: jest lifecycle (`globalSetup.js`, `globalTeardown.js`, `setupTestFramework.js`), the `patch-node-env.js` environment, the crash reporter, the case `runner/`, the `snapshot/` resolver, and `runtimes/` (preload/setup files for Bun and Deno). Reusable assertions and fixtures go in `helpers/`.
  - `RoundTripConfigCases` re-bundles the output of `configCases` that have a `roundTrip.js`.
  - `external/` — what webpack doesn't maintain: every git submodule (today the four spec corpora below and terser's and swc's own tests) — upstream's to change, ours only to pin. `external/wpt/` (web-platform-tests), checked out one commit deep by `parser (html)` and `syntax-equivalence`, holds the HTML tree-construction corpus since html5lib-tests dropped it.
  - `fixtures/acorn-corpus.json` — acorn's test suite, vendored rather than pinned (acorn's npm tarball ships no tests); `unitCases/WebpackParser.unittest.js` records and checks it — refreshing it: [TESTING_DOCS.md](../TESTING_DOCS.md#the-acorn-corpus).

**Git submodules** — all under `test/external/`, checked out on demand: `yarn setup` doesn't fetch them, and each CI job fetches only its own, one commit deep.

- `test/external/test262-cases` — [tc39/test262](https://github.com/tc39/test262); fetched by `test262`, `parser (js)`, `parser (minify-corpora)`
- `test/external/html5lib-tests` — [html5lib/html5lib-tests](https://github.com/html5lib/html5lib-tests); fetched by `parser (html)`
- `test/external/wpt` — [web-platform-tests/wpt](https://github.com/web-platform-tests/wpt); fetched by `parser (html)`, `syntax-equivalence` (browsers)
- `test/external/css-parsing-tests` — [CourtBouillon/css-parsing-tests](https://github.com/CourtBouillon/css-parsing-tests); fetched by `parser (css)`
- `test/external/terser` — [terser/terser](https://github.com/terser/terser), pinned to the installed `terser`'s version; fetched by `parser (minify-corpora)`
- `test/external/swc` — [swc-project/swc](https://github.com/swc-project/swc), read only under `crates/swc_ecma_minifier/tests`; fetched by `parser (minify-corpora)`

```sh
git submodule update --init --recursive --depth 1   # check out the commits the repo pins
git submodule update --init --recursive --remote --depth 1 # move every pin to its upstream tip
```

Keep `--depth 1` (`wpt` alone is ~161k files). `--remote` changes the recorded commits, so `git status` shows the paths modified — commit that only once CI is green on them, or `git submodule update` back to the pins.

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
