---
"webpack": patch
---

Fold more values, calls, loops and dead code when minifying, take arithmetic as running no `valueOf` or `toString` as terser and swc do unless `compress.pure_conversions` is `false`, and fix wrong output.
