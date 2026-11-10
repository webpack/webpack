---
"webpack": patch
---

Write `new (0, a.b)` as `new a.b`, keep `a ? !1 : (b = 1)` where `!a && (b = 1)` is longer, and end a function with `if (a) return a` for `return a || void 0` when minifying.
