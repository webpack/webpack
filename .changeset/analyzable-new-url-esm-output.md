---
"webpack": minor
---

Emit analyzable `new URL("./asset", import.meta.url)`, `new Worker(new URL(…, import.meta.url))` and `import("./chunk")` with a literal specifier for ESM module output.
