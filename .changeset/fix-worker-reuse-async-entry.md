---
"webpack": patch
---

Reuse the same async entrypoint for the same Worker URL within a module to avoid circular dependency warnings when multiple Workers reference the same resource.
