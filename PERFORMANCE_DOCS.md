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
node --print-bytecode --print-bytecode-filter=readWord <script that parses something>
```

`node --trace-turbo-inlining` shows what was inlined where and reports `Cannot consider <name> for inlining (reason: 5)` for a too-large callee.

**Instruction counts and time are different claims** — say which a number is. Callgrind over a warmed parse (`valgrind --tool=callgrind --smc-check=all-non-file`, differencing two run lengths so startup and tier-up drop out) resolves work to ~±0.2% and answers "does this do less", not "is the build faster": CPU time on a shared machine needs tens of fresh processes per arm to resolve a few percent, and allocation changes move GC timing in steps that swamp the mutator delta.

Claims about **webpack's CSS/HTML minifier or JS parser vs the ecosystem** (size, speed, memory, safety): run `yarn benchmark:css-tools` / `:html-tools` / `:js-tools` and read the tables (see [tooling/COMPARE_TOOLS.md](tooling/COMPARE_TOOLS.md)) instead of hand-rolling a comparison.

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
