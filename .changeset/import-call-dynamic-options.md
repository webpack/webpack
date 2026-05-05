---
"webpack": patch
---

Preserve side effects of a non-static second `import()` argument by wrapping the runtime require chain in an IIFE that evaluates the original options source first. For example, `import("./mod.js", yield)` inside a generator now correctly evaluates and suspends on `yield` before resolving the import.
