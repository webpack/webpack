---
"webpack": patch
---

Speed up JavaScript minification of large scopes by indexing each scope's function calls once instead of re-walking the scope for every function.
