---
"webpack": minor
---

Add `module.parser.javascript.worklet` option to bundle Worklet `addModule()` entries; the worklet's chunks (splits, runtime and dynamic imports) are pre-added via `addModule` since worklets can't load chunks at runtime.
