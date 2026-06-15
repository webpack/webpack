# Types Coverage Analysis

Snapshot of webpack's JSDoc type coverage and a prioritized guide to where
types can be made stricter (replacing `EXPECTED_ANY` / `unknown` with narrowed
types, often via `@template`).

## How to collect coverage

```bash
yarn types:cover            # runs node_modules/tooling/type-coverage
```

It type-checks the `tsconfig.json` program (`./lib/**/*.js` plus the configured
includes), walks every identifier, and marks an identifier **untyped** when its
type is `any` or the type string contains `any`. Output:
`coverage/coverage-types.json` (Istanbul-shaped; `s[i] === 0` means untyped).

`yarn types:cover:report` additionally renders an HTML lcov report.

> Note: the tool flags `any` only. It treats `EXPECTED_ANY` (a project alias
> `type EXPECTED_ANY = any`) as untyped too, so the untyped count is the set of
> identifiers we _could_ narrow — both genuine gaps and deliberate escapes.

## Current result

| Metric                      | Value             |
| --------------------------- | ----------------- |
| Overall coverage            | **97.60%**        |
| Typed identifiers           | 194,256 / 199,032 |
| Untyped (`any`) identifiers | 4,776             |
| Files analyzed              | 707               |

Coverage is already high; the remaining 2.4% is concentrated in a handful of
dynamic subsystems (serialization, stats, caching, variadic tuple utilities).

## Untyped identifiers by area

| Area                   |   Untyped |      Total |      Coverage |
| ---------------------- | --------: | ---------: | ------------: |
| `lib/` (root files)    |      1187 |      60525 |         98.0% |
| `lib/dependencies`     |       826 |      25353 |         96.7% |
| `lib/util`             |       480 |      12517 |         96.2% |
| `lib/stats`            |       365 |       7291 |         95.0% |
| `lib/cache`            |       253 |       3578 |         92.9% |
| `lib/serialization`    |       167 |       4344 |         96.2% |
| `lib/javascript`       |       165 |      12127 |         98.6% |
| `lib/errors`           |       119 |       1335 |         91.1% |
| `lib/html`             |       107 |      11204 |         99.0% |
| `lib/css`              |        92 |      11573 |         99.2% |
| `examples` / `tooling` | 372 / 121 | 2278 / 781 | 83.7% / 84.5% |

(`examples` and `tooling` are not shipped types — lowest priority.)

## Lowest-coverage shippable files (≥ 40 identifiers)

| Coverage | Untyped/Total | File                                            |
| -------: | ------------: | ----------------------------------------------- |
|    58.6% |       120/290 | `lib/util/registerExternalSerializer.js`        |
|    68.3% |         19/60 | `lib/util/TupleQueue.js`                        |
|    70.7% |       136/464 | `lib/stats/StatsFactory.js`                     |
|    73.1% |        59/219 | `lib/util/TupleSet.js`                          |
|    75.0% |         11/44 | `lib/serialization/AggregateErrorSerializer.js` |
|    75.6% |         19/78 | `lib/cache/MemoryCachePlugin.js`                |
|    76.3% |        33/139 | `lib/serialization/PlainObjectSerializer.js`    |
|    77.5% |         18/80 | `lib/serialization/Serializer.js`               |
|    80.4% |         18/92 | `lib/errors/WebpackError.js`                    |
|    82.1% |        57/318 | `lib/stats/StatsPrinter.js`                     |

## Files with the most untyped identifiers

| Untyped | Coverage | File                                     |
| ------: | -------: | ---------------------------------------- |
|     232 |    97.0% | `lib/Compilation.js`                     |
|     147 |    93.4% | `lib/cache/PackFileCacheStrategy.js`     |
|     146 |    98.1% | `lib/javascript/JavascriptParser.js`     |
|     141 |    97.6% | `lib/FileSystemInfo.js`                  |
|     136 |    70.7% | `lib/stats/StatsFactory.js`              |
|     120 |    58.6% | `lib/util/registerExternalSerializer.js` |
|      98 |    95.5% | `lib/stats/DefaultStatsPrinterPlugin.js` |
|      80 |    97.0% | `lib/NormalModule.js`                    |

## What the `any` actually is

Two preliminary findings shape the recommendations:

- **Raw `{any}` is essentially absent.** Every `@param/@returns/@type` that says
  `any` in `lib/` is descriptive prose ("error if any"), not a type. The codebase
  already routes intentional escapes through `EXPECTED_ANY` (335 occurrences in
  74 files).
- **`unknown` is used idiomatically and correctly** — almost always as the
  double-cast bridge `/** @type {Target} */ (/** @type {unknown} */ (x))` or as a
  generic constraint (`@template {unknown[]} T`). These should stay.

So the lever is `EXPECTED_ANY`, split into improvable vs. deliberate.

### Category A — improvable (narrow these)

1. **Serialization `read()` call sites.** `read()` returns `EXPECTED_ANY`, which
   makes every deserialized local untyped. This is the single biggest source of
   gaps (`registerExternalSerializer.js` at 58.6%, the serializers, cache
   strategies). Narrow at the call site:

   ```js
   // before — `source`, `cachedData` are any
   deserialize({ read }) {
       const source = read();
       const cachedData = read();
       return new CachedSource(source, cachedData);
   }
   // after
   deserialize({ read }) {
       const source = /** @type {Source} */ (read());
       const cachedData = /** @type {CachedData} */ (read());
       return new CachedSource(source, cachedData);
   }
   ```

   Better still, make the context generic so `read` is typed once:
   `@template T` on `ObjectDeserializerContext` with `read: () => T`, or add
   typed `readX()` helpers. This alone would move several files from ~75% to ~95%.

2. **`Comparator<EXPECTED_ANY>` in stats.** `lib/stats/StatsFactory.js:22`
   aliases `Comparator` to `Comparator<EXPECTED_ANY>`, erasing element types
   through every sort. Thread the element type with `@template`:

   ```js
   /**
    * @template T
    * @typedef {import("../util/comparators").Comparator<T>} Comparator
    */
   ```

3. **Variadic tuple utilities (`TupleSet`, `TupleQueue`, `WeakTupleMap`).**
   They model the tuple tail as `[T, V, ...EXPECTED_ANY]`. A bounded rest
   generic narrows the tail while keeping the variadic shape:

   ```js
   /**
    * @template T
    * @template V
    * @template {EXPECTED_ANY[]} [R=EXPECTED_ANY[]]   // bounded rest
    */
   class TupleSet {
   	/* args: [T, V, ...R] */
   }
   ```

   `WeakTupleMap` already does this (`@template {unknown[]} T`) — it's the model
   to copy.

4. **`Record<string, EXPECTED_ANY>` "context" objects** (e.g.
   `StatsFactoryContext`, hook context bags). Where the dynamic keys are known
   per call, prefer a `@template` payload over an open `any` record so consumers
   get inference instead of `any` on every property read.

### Category B — deliberate (leave as `EXPECTED_ANY`, don't churn)

- **Proxy traps / dynamic method installation** (`lib/util/deprecation.js`):
  `set(target, property, value, receiver)` and per-method assignment onto a Set
  are inherently `any` at the reflection boundary.
- **`PlainObjectSerializer`, `ObjectMiddleware`, `cleverMerge`** operate on
  arbitrary user objects by design; `unknown` there would force casts at every
  use with no safety gain.
- **`{ new <T = EXPECTED_ANY>() }` constructor factories** — the `any` default is
  the public, unconstrained entry point.

Keep these as `EXPECTED_ANY` (which already documents intent) rather than
converting to `unknown` or fighting the type system.

## Recommended order of work

1. **Serialization context generic** — highest leverage, fixes `read()` fan-out
   across `serialization/`, `cache/`, and `registerExternalSerializer.js`.
2. **`Comparator<T>` made generic again in stats** — small, mechanical, isolated.
3. **Bounded rest generics for the Tuple\* utilities** — self-contained, copy the
   `WeakTupleMap` pattern.
4. **Per-file sweeps** of `lib/errors` and `lib/stats` printer plugins where the
   `any` is a missing cast, not a dynamic boundary.

After any JSDoc change reachable from a public export, run `yarn fix:special`
(regenerates `types.d.ts`) and `yarn tsc`, then re-run `yarn types:cover` to
confirm the delta.
