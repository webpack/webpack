---
"webpack": minor
---

Add experimental `experiments.moduleSplitting` to split async-only exports into the async chunk, with `include`/`exclude` filters, a `module.rules` `moduleSplitting` flag, and a `/* webpackSplit */` source hint to control which modules are split.
