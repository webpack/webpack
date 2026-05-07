---
"webpack": patch
---

Fix CSS modules `composes` parsing so `local()` and `global()` function wrappers are tracked per class name. Previously, `composes: a global(b) local(c)` (or any mix within a single comma-separated group) treated every class with the same scope as the last function-wrapped token, so `b` was incorrectly resolved as a local self-reference.
