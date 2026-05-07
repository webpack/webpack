---
"webpack": patch
---

Refactor CssGenerator: rename `_cssSourceToJsStringLiteral` to `_cssToJsLiteral` and remove unused parameters, hoist shared variables to eliminate duplicate declarations, flatten nested source map wrapping logic, and extract repeated type annotations into typedefs
