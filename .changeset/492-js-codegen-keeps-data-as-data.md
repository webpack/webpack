---
"webpack": patch
---

Keep strings, regular expressions, comments, chunk names and file names from turning into code when webpack rewrites or wraps a module: dead-branch removal, pure-expression wrappers, inlined exports, CommonJS self-references, live exports in module libraries, context and AMD requires, worklets, `new URL()`, `import.meta.webpack`, banners, source map comments, asset externals and inlined ESM entries now leave the surrounding code as it was, and asset names follow only real `data:` URIs.
