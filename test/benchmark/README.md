# Benchmark suite

This directory contains non-comparative benchmarks for the current webpack
working tree. CodSpeed records instruction counts in CI; local runs report
wall-clock latency.

## Layout

- `unit/` contains focused core benchmarks and mirrors `lib/`.
- `e2e/` contains full webpack builds grouped by workload.
- `helpers/` contains deterministic fixture generators.
- `lib/` contains suite discovery, execution and webpack lifecycle helpers.

A unit suite has the same relative path and exact basename as its primary core
file. For example:

```text
lib/javascript/JavascriptParser.js
test/benchmark/unit/javascript/JavascriptParser.bench.mjs
```

The default suite name must also match that path:
`unit/javascript/JavascriptParser`. The runner validates both conventions.
A suite may exercise inseparable dependencies, but its measured operation
should primarily belong to the named core file.

## Commands

```bash
yarn benchmark:unit
yarn benchmark:e2e
yarn benchmark:suite
yarn benchmark:suite --filter "JavascriptParser"
yarn benchmark:suite --dir unit --smoke
yarn benchmark:suite --dir e2e --shard 1/2
yarn benchmark:suite --list
yarn benchmark:suite --json test/js/benchmark-results.json
```

`--smoke` executes each selected benchmark once without measuring it. Use it
before a full run when adding or changing suites.

## Adding a unit suite

1. Choose a core file with work substantial enough to regress build time or
   memory use.
2. Mirror its `lib/` path under `unit/` and use the exact core basename.
3. Generate deterministic fixtures in `setup`; keep fixture creation outside
   the measured function.
4. Cover distinct expensive paths with separate benches, without splitting one
   operation into tiny implementation-detail benchmarks.
5. Keep a measured invocation long enough to reduce timer noise by batching
   small operations over a fixed fixture.
6. Run the suite in smoke and measurement modes.

Fixtures must not depend on time, ambient files or `Math.random()`. Generated
e2e projects belong in a `generated/` directory, which is ignored by Git and
recreated by the suite.
