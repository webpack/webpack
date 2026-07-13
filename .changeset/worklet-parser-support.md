---
"webpack": minor
---

Add `module.parser.javascript.worklet` option to bundle Worklet `addModule()` entries; module output links the worklet's split chunks via native `import`, script output pre-adds them via `addModule` since script worklets can't load chunks at runtime.
