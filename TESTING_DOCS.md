# Webpack Test Suite Structure

This document explains the structure of the `test/` directory in the Webpack project using Jest. The directory is organized into multiple folders and files, each serving a specific purpose in testing various aspects of Webpack’s functionality.

## Folder and File Breakdown

### 1. `__snapshots__/`

- **Purpose**: Stores Jest snapshot files for comparing output consistency over time.
- **Usage**: Used for testing UI components, serialized data, or expected module outputs.

### 2. `benchmarkCases/`

- **Purpose**: Contains test cases for benchmarking Webpack's performance.
- **Usage**: Measures build times, memory usage, and optimization impact.
- **Kinds of case** (picked from the directory name):
  - _build_ (default, e.g. `many-modules-esm/`) — a `webpack.config.mjs` plus an entry; measures one build per scenario (`mode-development`, `mode-development-rebuild`, `mode-production`).
  - `*-unit` (e.g. `js-parser-unit/`) — an `index.bench.mjs` exporting `default (bench) => {…}`; measures a piece of `lib/` directly, with no scenarios.
  - `*-runtime` (e.g. `many-modules-interop-runtime/`) — measures **the emitted bundle**, not the build. The case is compiled once per scenario outside any measured region; the `exec` task then instantiates the output (runtime bootstrap plus every module factory that runs at import time) and calls the entry's exported `run` on it. The rebuild scenario is skipped, since it emits the same output.
- **Writing a `*-runtime` case**: the entry must export `run(seed)`, do its work with that opaque seed, and return the result — otherwise the compiler folds the workload away and the bench measures nothing (both are checked and fail the run). The harness forces `target: "node"` and a `commonjs2` library so the output can be instantiated in-process; generate large fixtures from `options.mjs` (`setup()`), as the build cases do.

`exec` is reported per scenario, so a `development`/`production` pair shows what scope hoisting and minification are worth at runtime.

### 3. `cases/`

- **Purpose**: General test cases covering core functionalities.
- **Usage**: Includes unit and integration tests for various modules and features.

### 4. `configCases/`

- **Purpose**: Tests related to Webpack configurations.
- **Usage**: Ensures that Webpack’s configuration (e.g., loaders, plugins) functions correctly.

### 5. `fixtures/`

- **Purpose**: Stores sample/mock data used in tests.
- **Usage**: Helps in creating consistent test cases with predefined inputs.

### 6. `helpers/`

- **Purpose**: Utility functions and scripts to assist in testing.
- **Usage**: Provides reusable functions for mock data generation, cleanup, and assertions.

### 7. `hotCases/`

- **Purpose**: Focuses on Webpack’s Hot Module Replacement (HMR) functionality.
- **Usage**: Ensures live reloading and hot updates work correctly.

### 8. `hotPlayground/`

- **Purpose**: An experimental space for testing HMR features.
- **Usage**: Allows exploration of new HMR implementations.

### 9. `memoryLimitCases/json`

- **Purpose**: Contains test cases related to memory limits.
- **Usage**: Ensures Webpack doesn’t exceed memory constraints.

### 10. `statsCases/`

- **Purpose**: Tests focused on Webpack’s statistical outputs.
- **Usage**: Verifies correct bundle sizes, dependencies, and optimizations.

### 11. `typesCases/`

- **Purpose**: Type-checking tests, likely for TypeScript integration.
- **Usage**: Ensures proper type definitions and compliance.

### 12. `test262-cases/`

- **Purpose**: ECMAScript test262 conformance test cases.
- **Usage**: Git submodule — initialize with `git submodule update --init test/test262-cases`. Test runner: `test/test262.spectest.js`.

### 12b. `html5lib-tests/`

- **Purpose**: WHATWG html5lib-tests tokenizer conformance cases for `lib/html/syntax`.
- **Usage**: Git submodule — initialize with `git submodule update --init test/html5lib-tests`. Test runner: `test/html5lib-webpack.spectest.js` (`yarn test:html5lib`) compiles every input as a webpack HTML entry to confirm the full pipeline handles it without crashing.

### 12c. `css-parsing-tests/`

- **Purpose**: CSS Syntax Level 3 conformance corpus for `lib/css/syntax`.
- **Usage**: Git submodule — initialize with `git submodule update --init test/css-parsing-tests`. Test runner: `test/cssParsing-webpack.spectest.js` (`yarn test:css-parsing`) compiles every input as a webpack CSS entry to confirm the full pipeline handles it without crashing.

### 13. `watchCases/`

- **Purpose**: Tests for Webpack’s watch mode functionality.
- **Usage**: Ensures file changes trigger correct rebuild behavior.

### 14. `*.unittest.js`

- **Purpose**: Contains unit tests for various functionalities.
- **Usage**: Ensures individual modules and functions work as expected.

### 15. `BannerPlugin.test.js`

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

`ProfilingPlugin.unittest.js`, `SyntaxBrowserEquivalence.unittest.js` and
`WebpackDevServer.longtest.js` launch Chrome through `test/helpers/launchChrome.js`.
**A browser that will not launch fails the suite — it is never skipped**, so no
environment can report these checks as passing without having run them. The
helper uses the installed Chrome channel; set `PUPPETEER_EXECUTABLE_PATH` to
point at another binary.

They are excluded from `test:bun` / `test:deno` (see the `--testPathIgnorePatterns`
in those scripts): under Jest on Bun, loading the ESM-only `puppeteer-core` fails
outright with "Provided module is not an instance of Module", and Jest's
`require(ESM)` fallback needs Node >= 24.9. Drop the exclusion once those
runtimes can load it.

## How to Run Tests

To execute all tests:

```sh
yarn test
```

**Choose test command based on modified directory:**

| Modified directory/file   | Command                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `test/*.unittest.js`      | `yarn test:base --testPathPatterns="<filename>"`                                              |
| `test/cases/`             | `yarn test:basic`                                                                             |
| `test/configCases/`       | `yarn test:basic --testPathPatterns="ConfigTestCases"`                                        |
| `test/statsCases/`        | `yarn test:basic --testPathPatterns="StatsTestCases"`                                         |
| `test/watchCases/`        | `yarn test:base --testPathPatterns="WatchTestCases"`                                          |
| `test/hotCases/`          | `yarn test:base --testPathPatterns="HotTestCases"`                                            |
| `test/benchmarkCases/`    | `FILTER="<case-name>" yarn benchmark`                                                         |
| `test/test262-cases/`     | `yarn test:test262` (requires `git submodule update --init test/test262-cases` first)         |
| `test/html5lib-tests/`    | `yarn test:html5lib` (requires `git submodule update --init test/html5lib-tests` first)       |
| `test/css-parsing-tests/` | `yarn test:css-parsing` (requires `git submodule update --init test/css-parsing-tests` first) |

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
