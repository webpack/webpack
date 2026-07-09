---
"webpack": patch
---

Skip the anonymous default export `.name` fix-up when the function's `name` property is non-configurable (pre-ES2015 engines such as Chrome <= 42) instead of throwing `TypeError: Cannot redefine property: name` and breaking bundle evaluation.
