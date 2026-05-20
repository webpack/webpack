---
"webpack": patch
---

Stop `webpackPrefetch` / `webpackPreload` magic comments from leaking across `import()` call sites that share a `webpackChunkName`. When two imports targeted the same named chunk and only one of them set `webpackPrefetch: true`, the prefetch directive was applied from every parent chunk that referenced the named chunk. Prefetch and preload orders are now resolved per `import()` call site instead of from the shared chunk group's accumulated options.
