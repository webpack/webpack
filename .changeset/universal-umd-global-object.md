---
"webpack": patch
---

Default `output.globalObject` to `globalThis` for universal (web + node) builds, and infer `output.environment.globalThis` for ES module output.
