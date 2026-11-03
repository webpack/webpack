---
"webpack": patch
---

Fix `if` and conditional dead-code elimination picking the wrong branch when the folded test is `NaN`, e.g. `if (0 / 0) { a } else { b }` keeping `a`.
