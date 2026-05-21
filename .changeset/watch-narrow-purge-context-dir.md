---
"webpack": patch
---

Fix slow `require.context()` / dynamic `import()` rebuilds in watch mode (#13636). When a file inside a watched context directory changed, `NodeWatchFileSystem` would call `inputFileSystem.purge(contextDir)`. The enhanced-resolve `purge` implementation matches cache keys with `key.startsWith(contextDir)`, so the stat cache of every file under the directory was discarded on every rebuild — `ContextModuleFactory.resolveDependencies` then re-`stat`-ed the whole tree on each rebuild. Single-file rebuilds on a 4000-file context now reuse the warm stat cache, dropping the rebuild from ~370 ms to ~225 ms in a local reproduction (≈40%). For directory items that are explicitly watched contexts, only the directory's own `readdir` entry is invalidated; file-level changes in the same aggregated event continue to purge file stats and the parent `readdir` (via `purgeParent`) as before.
