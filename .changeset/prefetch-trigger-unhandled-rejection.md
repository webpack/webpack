---
"webpack": patch
---

Silence unhandled rejection from the prefetch trigger when chunk loading fails. The `ensureChunkHandlers.prefetch` runtime created `Promise.all(promises).then(...)` whose result is discarded by `__webpack_require__.e`. If chunk loading rejected (e.g. `chunkLoadTimeout`), that dangling chain produced an unhandled rejection. Prefetch is best-effort, so a no-op rejection handler is now attached.
