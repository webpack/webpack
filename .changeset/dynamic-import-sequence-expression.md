---
"webpack": patch
---

Resolve the static specifier of a dynamic `import()` whose argument is a side-effect-free `SequenceExpression`, e.g. `import((1, 0, "./mod.js"))` is now treated the same as `import("./mod.js")` instead of being rejected as unresolvable.
