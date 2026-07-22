---
"webpack": patch
---

Fix deferred import evaluation: re-throw cached errors, guard forcing a still-evaluating module, keep re-exported deferred namespaces identical, and evaluate initial-chunk deferred context imports lazily.
