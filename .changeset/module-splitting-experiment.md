---
"webpack": minor
---

Add experimental `experiments.moduleSplitting` to split async-only exports into the async chunk. Like Turbopack, it is automatic and honors the `sideEffects` convention (modules declaring side effects are left alone); `include`/`exclude` filters, a `module.rules` `moduleSplitting` flag, and a `/* webpackSplit */` source hint override which modules are split.
