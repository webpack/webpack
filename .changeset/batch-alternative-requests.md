---
"webpack": patch
---

Reduce per-file overhead in `ContextModuleFactory.resolveDependencies` by batching `alternativeRequests` hook calls. Previously the hook was invoked once per file in the context (with a single-item array), paying per-call overhead (closure allocation, `resolverFactory.get`, intermediate arrays in `RequireContextPlugin`) for every file. The hook is now invoked once per directory with all matched files in one batch — `RequireContextPlugin`'s tap already iterates the items array, so the output is unchanged. Steady-state rebuild on a 4000-file `require.context` drops a further ~15 ms (after the watch-mode purge fix in the same release).
