---
"webpack": patch
---

Add a per-invocation `fs.stat` result cache to `ContextModuleFactory.resolveDependencies` to reduce redundant filesystem calls during `require.context` scans. When the same path is encountered more than once within a single scan (for example due to overlapping resource arrays or symlink graphs), the result is served from an in-memory cache instead of issuing a second syscall. The cache is scoped to one `resolveDependencies` call so it never serves stale data across HMR rebuilds.
