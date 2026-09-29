# Verifying a performance or memory change

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps a pointer here. -->

This whole document is **required** reading before claiming or measuring a performance, memory or emitted-size change.

Perf/memory claims need evidence, and the cheap kinds are the trustworthy ones; prefer, in order:

1. **Counting** — calls, allocations, retained objects. Deterministic; run once.
2. **CPU-profile attribution** — `node --cpu-prof`, sum self time per bucket. Robust to load.
3. **Retained heap** — `node --expose-gc`, GC several times, read `v8.getHeapStatistics().used_heap_size`.
4. **Wall/CPU timing** — last resort: interleave arms in one process, report `n` and dispersion; a difference below run-to-run spread is no result.

`FILTER="<case-name>" yarn benchmark` drives the repo's cases; fixtures are in `test/benchmarkCases/`.

**Some hot methods are sized to V8's inlining budget.** TurboFan won't inline a callee over its bytecode limit (460 at the time of writing), so adding anything to a method just under it silently loses the inlining. `lib/javascript/syntax-parser.js` keeps `readWord`, `readString` and `finishToken` under it deliberately, with rare arms split into `_readWordIntoCache`, `_readWordUncacheable`, `_readStringCold` and `_updateContext`; `readWord` has ~6 bytes of headroom and once cost 1.4% from one added argument. Check the size before and after touching them:

```sh
# replace path/to/parse-script.js with any script that runs the parser
node --print-bytecode --print-bytecode-filter=readWord path/to/parse-script.js
```

`node --trace-turbo-inlining` shows what was inlined where and reports `Cannot consider <name> for inlining (reason: 5)` for a too-large callee.

**Instruction counts and time are different claims** — say which a number is. Callgrind over a warmed parse (`valgrind --tool=callgrind --smc-check=all-non-file`, differencing two run lengths so startup and tier-up drop out) resolves work to ~±0.2% and answers "does this do less", not "is the build faster": CPU time on a shared machine needs tens of fresh processes per arm to resolve a few percent, and allocation changes move GC timing in steps that swamp the mutator delta.

Claims about **webpack's CSS/HTML minifier or JS parser vs the ecosystem** (size, speed, memory, safety): run `yarn benchmark:css-tools` / `:html-tools` / `:js-tools` and read the tables (see [tooling/COMPARE_TOOLS.md](../tooling/COMPARE_TOOLS.md)) instead of hand-rolling a comparison.

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

## Reading the code-size report

**Then check wire cost.** `yarn test:size` (and the `Code Size` CI job, which compares against `main`'s last report and comments on the PR) builds every `configCases/` case and reports **one row per changed asset**: raw before → after plus gzip/brotli/zstd. **It is information, never a verdict** — it doesn't fail, and moving numbers isn't a defect. It answers:

- **Which files changed, by how much?** The per-asset table is the headline; no suite-wide total is reported (nothing actionable). Raw is what the generator wrote, compressed is what users download — read both; a raw saving with no gzip saving mostly moved entropy. [gzip decides](#verifying-a-performance-or-memory-change).
- **Which way?** 🔴 ↑ grew, 🟢 ↓ shrank.
- **Change or new?** Assets both runs emit are changes; ones only one run emits are new or deleted files, not deltas. They're in separate tables — changed first and unfolded, new/deleted folded, each with its own row budget — and separate verdict rows (`Changed …` vs `New` / `Deleted`), so new test cases' bundles don't bury real changes.
- **webpack or the case?** A bundle is a function of its case's source, so adding assertions to a `configCases/` case grows its bundle without touching `lib/`. The report measures each case's module source and splits changed assets: `Changed, test untouched` is webpack's doing and the row size claims are read from; `Changed, test edited` has a `Test edit` column with bytes of source gained — a bundle growing less than its case isn't a regression. Cite the first row, never suite-wide numbers, when a PR touches both `lib/` and tests.
- **Did a runtime gain or lose a runtime module?** A second table counts runtime modules per runtime and names those that came or went, split the same way (a runtime a new case brought gained nothing). Deliberately no per-runtime-module bytes (not what anyone downloads); the count catches a runtime module added for one target and forgotten for another.

Read the "emitted nothing" note first: a case whose build now errors contributes no bytes, which otherwise looks like an improvement. When the numbers moved, say what it reported in the PR.
