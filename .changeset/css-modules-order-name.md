---
"webpack": minor
---

Add `optimization.cssModulesOrder` option (`"import" | "name"`, defaults to `"import"`) to control how CSS modules are ordered within a chunk. With `"name"`, modules are emitted in a deterministic order based on their full module name, bypassing the import-order topological merge and its "Conflicting order" warnings — useful when migrating from `mini-css-extract-plugin` to the builtin CSS support and when projects rely on CSS modules and only rarely share class names across files.
