---
"webpack": minor
---

Add `Compilation#addLazyRuntimeModule` and `NormalModuleFactory` hook
`prepareModuleType`; load parsers and generators only when their type is used.
