---
"webpack": patch
---

Keep the minified calls and reads that `eval`, `with` or a function called before a name is set can change, and read the minifier's `output` option as `format`.
