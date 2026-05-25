---
"webpack": patch
---

Replace `DefinePlugin` member access on an undefined object property with `undefined` instead of inlining the whole object.
