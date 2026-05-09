---
"webpack": patch
---

Fix CSS Modules `@value` resolution when the same local name is imported from multiple modules. Each reference now resolves through the `@value` import that was active at its source position, instead of always picking the first one.
