---
"webpack": patch
---

Keep minified JavaScript running as written where terser's output differed (a `let` assigned in a later initializer, `undefined` in a pattern, a negative BigInt base, a global accessor, a block's function in a loop test, an async function's thenable and a `RegExp` holding a NUL), and inline a block's `const` and a boolean read more than once.
