---
"webpack": patch
---

Rebuild a side-effect-free barrel in watch when `sideEffects` changes whether its re-export of a missing module is deferred, instead of keeping or dropping the missing-module throw.
