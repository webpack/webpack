---
"webpack": patch
---

Replace uninformative `throw new Error("TODO")` in `CommonJsExportRequireDependency.Template` with a descriptive error message. The `Object.defineProperty` case appears unreachable as the parser never creates a `CommonJsExportRequireDependency` with that base, but the error now clearly identifies the unsupported case if it is ever reached.
