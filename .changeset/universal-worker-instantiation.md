---
"webpack": minor
---

Support `new Worker(new URL(...))` in universal (node + web) targets by resolving the Worker constructor from `worker_threads` when no global `Worker` exists.
