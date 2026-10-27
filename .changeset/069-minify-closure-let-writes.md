---
"webpack": patch
---

Drop writes to a `let` that nothing reads from closures created after its declaration in the JavaScript minifier.
