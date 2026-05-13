---
"webpack": patch
---

Cache CSS ICSS `:export` / `@value` / `composes` reference resolution via `moduleGraph.cached`. Resolving references previously walked each parent module's full dependency list on every lookup; now per-module indices of `CssIcssImportDependency` (by local name) and `CssIcssExportDependency` (by export name) are built once per build and the top-level `resolve`/`resolveReferences` results are memoized for repeated lookups during code generation. `getLocalIdent` is also memoized per `(module, local)` so its hashing work is not repeated when the same identifier is interpolated more than once. Cycle semantics are unchanged: recursive calls pass `seen` and bypass the cache, so only completed top-level resolutions are memoized.
