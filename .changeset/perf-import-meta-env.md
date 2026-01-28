---
"webpack": patch
---

Fixed `import.meta.env.xxx` behavior: when accessing a non-existent property, it now returns empty object instead of full object at runtime.
