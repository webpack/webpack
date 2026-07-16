---
"webpack": minor
---

Warn on strict-mode-only syntax (`delete` of a variable, `with`, octal literals and escapes, duplicate parameters, assigning to `eval`/`arguments`) and semantic hazards (`arguments.callee`/`arguments.caller`, assigning to read-only globals) in modules emitted as ES module output, since they break at runtime; severity is configurable via the `strictModeViolations` parser option (`"error" | "warn" | false`, default `"warn"`, `"error"` under `experiments.futureDefaults`).
