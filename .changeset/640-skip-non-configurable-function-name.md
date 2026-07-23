---
"webpack": patch
---

Skip the anonymous default export `.name` fix-up when `name` is non-configurable, instead of throwing on pre-ES2015 engines.
