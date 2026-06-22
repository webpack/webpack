---
"webpack": patch
---

Resolve the global `new Worker(new URL(...))` to `worker_threads` on the `node` target.
