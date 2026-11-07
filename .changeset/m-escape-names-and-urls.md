---
"webpack": patch
---

Keep a JSON key that holds an escaped `"__proto__"` valid, keep an own `__proto__` key in the namespace of an `import()`ed JSON or CommonJS module, escape U+2028 and U+2029 where chunk ids and names are written into generated code, escape control characters in names printed by stats, and URL-encode file names in the SSR manifest.
