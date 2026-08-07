---
"webpack": patch
---

Round a folded `calc()` result the way an authored number is rounded, so `calc((6 / 10 - .375) * 1em)` prints `.225em` rather than `.22499999999999998em`.
