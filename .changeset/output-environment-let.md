---
"webpack": minor
---

Add `output.environment.let` option (paired with target's `let` capability) and emit `let`/`const` instead of `var` in generated runtime code wherever it is safe. Bindings that may be wrapped in runtime-condition `if` blocks (harmony imports, ConcatenatedModule external imports) continue to use `var` to preserve function scoping.
