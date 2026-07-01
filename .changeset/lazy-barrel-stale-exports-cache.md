---
"webpack": patch
---

Key `FlagDependencyExportsPlugin`'s provided-exports cache on a lazy barrel's deferred re-export set, so a later build that un-defers a re-export no longer restores stale exports and reports a false "export not found".
