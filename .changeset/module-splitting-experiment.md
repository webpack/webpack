---
"webpack": minor
---

Add experimental `experiments.moduleSplitting` to split async-only exports into the async chunk. Like Turbopack, it only splits modules proven side-effect-free (via `sideEffects` or source analysis); `include`/`exclude` filters, a `module.rules` `moduleSplitting` flag, and a `/* webpackSplit */` source hint override which modules are split.
