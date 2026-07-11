---
"webpack": minor
---

Warn on strict-mode-only syntax (`delete` of a variable, `with`, octal literals and escapes, duplicate parameters, assigning to `eval`/`arguments`) in modules emitted as ES module output, since it becomes a runtime SyntaxError; the warning becomes an error under `experiments.futureDefaults`.
