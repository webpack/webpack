---
"webpack": patch
---

Add `output.environment.spread`, `output.environment.hasOwn`, and `output.environment.symbol`, and use method shorthand, spread, `Object.hasOwn`, and an unguarded `Symbol` in generated runtime code where the environment supports it.
