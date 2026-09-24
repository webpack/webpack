# Webpack Test Suite Structure

This document explains the structure of the `test/` directory in the Webpack project using Jest. The directory is organized into multiple folders and files, each serving a specific purpose in testing various aspects of Webpack’s functionality.

## Folder and File Breakdown

Directories come first, in alphabetical order, then the individual files worth their own note. Add a new entry where the alphabet puts it — the sections are deliberately unnumbered, so nothing has to be renumbered around it.

### `__snapshots__/`

- **Purpose**: Stores Jest snapshot files for comparing output consistency over time.
- **Usage**: Used for testing UI components, serialized data, or expected module outputs.

### `benchmarkCases/`

- **Purpose**: Contains test cases for benchmarking Webpack's performance.
- **Usage**: Measures build times, memory usage, and optimization impact.
- **Kinds of case** (picked from the directory name):
  - _build_ (default, e.g. `many-modules-esm/`) — a `webpack.config.mjs` plus an entry; measures one build per scenario (`mode-development`, `mode-development-rebuild`, `mode-production`).
  - `*-unit` (e.g. `js-parser-unit/`) — an `index.bench.mjs` exporting `default (bench) => {…}`; measures a piece of `lib/` directly, with no scenarios.
  - `*-runtime` (e.g. `many-modules-interop-runtime/`) — measures **the emitted bundle**, not the build. The case is compiled once per scenario outside any measured region; the `exec` task then instantiates the output (runtime bootstrap plus every module factory that runs at import time) and calls the entry's exported `run` on it. The rebuild scenario is skipped, since it emits the same output.
- **Writing a `*-runtime` case**: the entry must export `run(seed)`, do its work with that opaque seed, and return the result — otherwise the compiler folds the workload away and the bench measures nothing (both are checked and fail the run). The harness forces `target: "node"` and a `commonjs2` library so the output can be instantiated in-process; generate large fixtures from `options.mjs` (`setup()`), as the build cases do.

`exec` is reported per scenario, so a `development`/`production` pair shows what scope hoisting and minification are worth at runtime.

### `cases/`

- **Purpose**: General test cases covering core functionalities.
- **Usage**: Includes unit and integration tests for various modules and features.

### `configCases/`

- **Purpose**: Tests related to Webpack configurations.
- **Usage**: Ensures that Webpack’s configuration (e.g., loaders, plugins) functions correctly.

### `external/`

- **Purpose**: Every git submodule webpack checks out for testing — today the four spec corpora below and terser's own test corpus. Nothing here is webpack's to edit: each directory belongs to its upstream project, and this repository only pins a commit.

#### `test262-cases/`

- **Purpose**: ECMAScript test262 conformance test cases.
- **Usage**: Git submodule — initialize with `git submodule update --init test/external/test262-cases`. Test runner: `test/specCases/test262.spectest.js`.

#### `html5lib-tests/`

- **Purpose**: WHATWG html5lib-tests tokenizer conformance cases for `lib/html/syntax`.
- **Usage**: Git submodule — initialize with `git submodule update --init --depth 1 test/external/html5lib-tests test/external/wpt`: the runner reads both corpora. Test runner: `test/specCases/html5lib.spectest.js` (`yarn test:html5lib`) compiles every input as a webpack HTML entry to confirm the full pipeline handles it without crashing.

#### `wpt/`

- **Purpose**: web-platform-tests, read two ways. `html/syntax/parsing/resources/*.dat` is the HTML tree-construction conformance corpus for `parseHtml` (html5lib-tests dropped its copy in `224991e`). The `.html` documents under `html/`, `conformance-checkers/` and `dom/nodes`, plus the declarations the `css/**/parsing/` tests state a verdict for, are the printers' corpus: minifying must not change the DOM webpack's parser builds, the DOM Chrome builds, or the style Chrome computes.
- **Usage**: Git submodule — initialize with `git submodule update --init --depth 1 test/external/wpt` (the repository is ~161k files, so keep it shallow). Test runners: `test/specCases/html5lib.spectest.js` (`yarn test:html5lib`), which also reads `test/external/html5lib-tests` — initialize both to run the whole suite — and `test/specCases/syntaxEquivalence.spectest.js` (`yarn test:syntax-equivalence`), whose browser tiers need a Chrome (`PUPPETEER_EXECUTABLE_PATH` picks a binary other than the installed channel). A document that is not UTF-8 is skipped: the encoding fixtures are UTF-16, which no string API can read as source.

#### `css-parsing-tests/`

- **Purpose**: CSS Syntax Level 3 conformance corpus for `lib/css/syntax`.
- **Usage**: Git submodule — initialize with `git submodule update --init test/external/css-parsing-tests`. Test runner: `test/specCases/cssParsing-webpack.spectest.js` (`yarn test:css-parsing`) compiles every input as a webpack CSS entry to confirm the full pipeline handles it without crashing.

#### `terser/`

- **Purpose**: terser's own repository, pinned to the version webpack depends on. Its `test/compress` cases are the corpus `lib/javascript/syntax-printer.js` is held to: each is minified by terser as published and by webpack's printer, under the case's own options and under the ones webpack's default minimizer passes, and the outputs must be byte-for-byte the same.
- **Usage**: Git submodule — initialize with `git submodule update --init --depth 1 test/external/terser`. Test runner: `test/specCases/terser.spectest.js` (`yarn test:terser`), which also fails when the pin and the installed `terser` disagree, so bumping the dependency means moving the pin with it.

### `fixtures/`

- **Purpose**: Stores sample/mock data used in tests.
- **Usage**: Helps in creating consistent test cases with predefined inputs.

### `harness/`

- **Purpose**: What runs the suites, as opposed to what they test. Jest's lifecycle (`globalSetup.js`, `globalTeardown.js`, `setupTestFramework.js`), the `patch-node-env.js` test environment, `runtimeCrashReporter.js`, the case `runner/`, the `snapshot/` resolver and matchers, `benchmark/`, and `runtimes/`.
- **`runtimes/`**: The preload and setup files that let jest run under a non-Node runtime — `bun-preload.js` and `bun-sandbox-setup.js` for `yarn test:bun`, `deno-worker-setup.js` and `deno-import-map.json` for `yarn test:deno`. Wired in through `jest.config.js` and the `test:base:bun` / `test:base:deno` scripts.
- **Not helpers**: a reusable assertion or fixture belongs in `helpers/`; `harness/` is only for machinery the test runner itself loads.

### `helpers/`

- **Purpose**: Utility functions and scripts to assist in testing.
- **Usage**: Provides reusable functions for mock data generation, cleanup, and assertions.

### `hotCases/`

- **Purpose**: Focuses on Webpack’s Hot Module Replacement (HMR) functionality.
- **Usage**: Ensures live reloading and hot updates work correctly.

### `hotPlayground/`

- **Purpose**: A hand-driven counterpart to `hotCases/` — those assert what an update does, this one lets you watch it happen in a browser. One panel per module type and ECMAScript form: an html entry, CommonJS, CSS, CSS modules, JSON via an import attribute, all three asset types, async and source-phase WebAssembly, `import defer` and an async chunk, plus a panel driving the HMR API itself (`data`/`dispose`, `addStatusHandler`, `check`, `invalidate`). Nothing here runs in CI.
- **Usage**: `yarn playground` serves it on `http://localhost:8080` with hot reloading on; edit any file and watch the page. See `test/hotPlayground/README.md` for what each file demonstrates.

### `memoryLimitCases/`

- **Purpose**: Contains test cases related to memory limits.
- **Usage**: Ensures Webpack doesn’t exceed memory constraints.

### `specCases/`

- **Purpose**: Holds the runners for specification-conformance suites.
- **Files**:
  - `test262.spectest.js` — `yarn test:test262`
  - `test262-parser.spectest.js` — `yarn test:test262-parser`
  - `html5lib.spectest.js` — `yarn test:html5lib`
  - `syntaxEquivalence.spectest.js` — `yarn test:syntax-equivalence`
  - `cssParsing-webpack.spectest.js` — `yarn test:css-parsing`
  - `terser.spectest.js` — `yarn test:terser`

### `statsCases/`

- **Purpose**: Tests focused on Webpack’s statistical outputs.
- **Usage**: Verifies correct bundle sizes, dependencies, and optimizations.

### `templates/`

- **Purpose**: The suite drivers — `TestCases.js`, `ConfigTestCases.js`, `HotTestCases.js`, `WatchTestCases.js` — each exporting `describeCases(config)`.
- **Usage**: The `*.test.js` / `*.basictest.js` / `*.longtest.js` files at the top of `test/` are thin shims that call `describeCases` with one suite's options, so one driver serves every variant (targets, devtools, cache modes). Jest parallelizes per file, which is why the variants stay separate files rather than being folded into one.
- **Variants**: `variants.js` holds the option sets the `TestCases*` and `HotTestCases*` shims run under, re-exported from each driver as `variants`. Add a variant by adding an entry there and one shim naming it — the shims stay separate files because jest parallelizes per file.
- **Note**: `templates/` is a sibling of the case directories it runs (`cases/`, `configCases/`, `hotCases/`, `watchCases/`), so a driver resolves paths from the shared `test/` root via `testRootDirectory` (`path.join(__dirname, "..")`), never against `__dirname`.

### `typesCases/`

- **Purpose**: Type-checking tests, likely for TypeScript integration.
- **Usage**: Ensures proper type definitions and compliance.

### `unitCases/`

- **Purpose**: Contains `*.unittest.js` unit tests for various functionalities.
- **Usage**: Ensures individual modules and functions work as expected.

### `watchCases/`

- **Purpose**: Tests for Webpack’s watch mode functionality.
- **Usage**: Ensures file changes trigger correct rebuild behavior.

### `CodeSizeTestCases.size.js`

- **Purpose**: Measures how large the code webpack generates is, so a change to `lib/` that grows (or shrinks) every bundle is visible.
- **Usage**: `yarn test:size` builds every `configCases/` case — one plain Node.js process, outside jest, no worker pool — and writes a JSON report of what each case emitted: the raw, gzip, brotli and zstd size of every asset, plus a per-runtime-module breakdown (total bytes over the suite, how many cases emit it, the biggest single instance) — which is what shows _which_ runtime grew, which is no longer emitted at all, and which one is simply large. The CI job (`.github/workflows/code-size.yml`) compares the report against the one `main` last uploaded, posts it as a pull request comment (updated in place on every push) and repeats it in the job summary.
- **What the comparison shows**: how many cases, runtime modules and assets are changed / new / deleted / unchanged, then **one row per changed asset** — raw before → after, and the percentage each of gzip, brotli and zstd moved. A suite-wide total is deliberately not reported: a single number over 1400 cases hides which file moved, which is the only actionable part. With no baseline to compare against, the same table ranks the biggest assets instead.
- **It never fails.** There is nothing to assert here and no size budget to breach: a growing bundle is information, not a defect. Cases whose expected result _is_ a build error emit nothing and are reported as such, with the reason, rather than counted as failures.
- **Options**: `--output <file>` (report path), `--baseline <file>` (report to compare against), `--summary <file>` (append the markdown comparison, e.g. `$GITHUB_STEP_SUMMARY`), `--filter` / `--negative-filter` (regexps matched against `<category>/<case>`, also read from `FILTER` / `NEGATIVE_FILTER`).
- **Note**: the cases are built with the defaults a user gets — minification on, no `output.pathinfo` — not with the `ConfigTestCases` ones. Needs Node.js >= 22.15 for zstd.

### `unitCases/BannerPlugin.unittest.js`

- **Purpose**: Tests Webpack’s `BannerPlugin` functionality.
- **Usage**: Ensures that the plugin correctly adds banners to the bundled files.

## Example Test Case Structure

Many Webpack tests simulate small projects that are compiled during the test run.

For example, a configuration test may look like:

test/configCases/entry/simple/
index.js
webpack.config.js
expected.txt

Explanation:

- index.js – entry file for the test project
- webpack.config.js – configuration used by webpack
- expected.txt – expected output or snapshot comparison

During the test run, webpack compiles this project and compares the result with the expected output to ensure behavior remains consistent.

## Testing Framework

- **Jest** is used for running tests.
- Snapshots help maintain consistency in output.
- Unit tests verify individual module functionality.
- Integration tests ensure multiple components work together.

### Suites that drive a real browser

`unitCases/ProfilingPlugin.unittest.js`, `specCases/syntaxEquivalence.spectest.js` and
`WebpackDevServer.longtest.js` launch a browser through `test/helpers/launchBrowser.js`.
**A browser that will not launch fails the suite — it is never skipped**, so no
environment can report these checks as passing without having run them. The
helper uses the installed Chrome channel; set `PUPPETEER_EXECUTABLE_PATH` to
point at another binary.

`syntaxEquivalence.spectest.js` is the one that reads more than one engine:
`EQUIVALENCE_BROWSER` takes `chrome`, `firefox` or `webkit`, and CI runs all
three as one matrix. Chrome and Firefox go through puppeteer; WebKit goes
through playwright, which is what reaches it, under a shim in
`test/helpers/launchBrowser.js` that answers to the puppeteer names the suites
call. Fetch the browser first — `yarn setup:firefox`, `yarn setup:webkit` —
which installs into puppeteer's own cache (`PUPPETEER_CACHE_DIR`, defaulting to
`~/.cache/puppeteer`) or playwright's; `FIREFOX_EXECUTABLE_PATH` and
`WEBKIT_EXECUTABLE_PATH` point at one already on the machine. Only Chromium
answers the media-emulation calls, so elsewhere a condition carries what no
viewport varies as text. A defect only one engine has is filed against it with a
reason opening `<engine> only:` rather than tolerated in all three.

They are excluded from `test:bun` / `test:deno` (see the `--testPathIgnorePatterns`
in those scripts): under Jest on Bun, loading the ESM-only `puppeteer-core` fails
outright with "Provided module is not an instance of Module", and Jest's
`require(ESM)` fallback needs Node >= 24.9. Drop the exclusion once those
runtimes can load it.

### Generated code is held to `output.environment`

No old browser runs in CI, so `test/helpers/ecmaConformance.js` asks the two
questions one would answer, over every `configCases` case in `ConfigTestCases`
and `ConfigCacheTestCases`. See that file for how it reads an environment.

- **Will it parse?** Always on: every runtime module a build renders is parsed
  against the environment it was rendered for.
- **Will it run?** `restrictEnvironment: true` in `test.config.js` removes from
  the bundle's realm what the target lacks, so webpack's guards are taken
  rather than stepped over. Web targets only.

Two more `test.config.js` fields: `ecmaConformance: true` widens the parse check
to every emitted asset, so the case's own sources are held to its
`output.environment` too, and
`ecmaConformanceExpected` declares findings deliberate as regexps, each with its
reason — one that stops matching fails the case.

### ESM output is held to what a foreign bundler reads

`test/helpers/analyzableConformance.js` walks every `output.module` case the way
another tool would: it takes the specifiers a lexer reports plus the
`new URL(…, import.meta.url)` names only an AST sees, follows the literal ones
from each entry, and asks two questions of what it reaches.

- **Does every chunk have a name someone else can follow?** A chunk only
  `__webpack_require__.e` reaches is a finding, unless the build recorded why it
  kept the runtime form — `performance.analyzableBailouts` reads the same
  reasons — or an `eval` devtool hid every specifier inside a string.
- **Does every name it writes exist?** A specifier naming a place inside the
  output that neither the assets nor the directory holds is a finding.

`analyzableConformanceExpected` in `test.config.js` declares findings deliberate
as regexps, each with its reason — one that stops matching fails the case.

Under `ecmaVersion/`, the `es5-*` cases cover one runtime-emitting feature each
(jsonp, `importScripts`, `require` and read-file chunk loading, workers and
asset urls, css, hot updates, wasm, the library wrappers, Module Federation,
the neutral platform);
`es-versions` sweeps every rung of the `esX` ladder; `environment-flags` turns
each flag off on its own against an otherwise current target, which a version
sweep cannot do; and `esm-environment` repeats both over ESM output.

## How to Run Tests

To execute all tests:

```sh
yarn test
```

**Choose test command based on modified directory:**

| Modified directory/file            | Command                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `test/unitCases/*.unittest.js`     | `yarn test:base --testPathPatterns="<filename>"`                                                                                                             |
| `test/specCases/`                  | Run the matching `yarn test:<suite>` command                                                                                                                 |
| `test/cases/`                      | `yarn test:basic`                                                                                                                                            |
| `test/configCases/`                | `yarn test:basic --testPathPatterns="ConfigTestCases"`                                                                                                       |
| `test/statsCases/`                 | `yarn test:basic --testPathPatterns="StatsTestCases"`                                                                                                        |
| `test/watchCases/`                 | `yarn test:base --testPathPatterns="WatchTestCases"`                                                                                                         |
| `test/hotCases/`                   | `yarn test:base --testPathPatterns="HotTestCases"`                                                                                                           |
| `test/benchmarkCases/`             | `FILTER="<case-name>" yarn benchmark`                                                                                                                        |
| `lib/runtime/`                     | `yarn test:size` (size of the generated code; `--filter "<category>/"` narrows it)                                                                           |
| `test/external/test262-cases/`     | `yarn test:test262` (requires `git submodule update --init test/external/test262-cases` first)                                                               |
| `test/external/html5lib-tests/`    | `yarn test:html5lib` (requires `git submodule update --init --depth 1 test/external/html5lib-tests test/external/wpt` first)                                 |
| `test/external/wpt/`               | `yarn test:html5lib` + `yarn test:syntax-equivalence` (require `git submodule update --init --depth 1 test/external/html5lib-tests test/external/wpt` first) |
| `test/external/css-parsing-tests/` | `yarn test:css-parsing` (requires `git submodule update --init test/external/css-parsing-tests` first)                                                       |

**Running a single test case** with `--testNamePattern`. The test name format is `<category> <case-name>` (e.g., `css basic`, `asset url`):

```sh
yarn test:basic --testPathPatterns="ConfigTestCases" --testNamePattern="css basic"
```

Multiple patterns can be combined with `|`:

```sh
yarn test:basic --testPathPatterns="ConfigTestCases" --testNamePattern="css basic|css url"
```

## Contribution Guide

- Add new test cases in the appropriate folder.
- Use Jest assertions and mocks for consistency.
- Run `yarn test` before pushing changes to validate functionality.
