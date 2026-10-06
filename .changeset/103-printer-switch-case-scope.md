---
"webpack": patch
---

Keep a `switch` whose `case` test reads a `let`, `const` or `class` declared in its body, which the minifier rewrote to an `if` that read the name outside its scope.
