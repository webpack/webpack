---
"webpack": patch
---

Include missing generator options in hash to ensure persistent cache invalidation when configuration changes (CssGenerator `exportsOnly`, JsonGenerator `JSONParse`, WebAssemblyGenerator `mangleImports`).
