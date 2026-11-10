---
"webpack": patch
---

Drop `new` before `RegExp` when minifying JavaScript and its pattern is a `+` expression, never a regular expression object.
