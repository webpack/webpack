---
"webpack": patch
---

Fix CSS modules `composes` so `composes: foo from "./self.module.css"` from inside `self.module.css` no longer creates a duplicate module instance. Fix CSS modules `composes` parsing so `local()` and `global()` function wrappers are tracked per class name. Fix CSS modules `composes: ... from "<file>"` so the composed files load in an order consistent with every rule's local composes order, instead of source first-appearance order.
