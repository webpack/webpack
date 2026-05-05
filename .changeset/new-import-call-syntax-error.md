---
"webpack": patch
---

Reject `new import.defer(...)` and `new import.source(...)` as a parse-time `SyntaxError`, matching the spec — `ImportCall` is a `CallExpression` and is not a valid operand of `new`. Parenthesized forms (`new (import.defer(...))`) remain valid and continue to throw `TypeError` at runtime as before.
