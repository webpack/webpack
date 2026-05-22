---
"webpack": patch
---

Inherit the proxy module's strict flag from the original module in `LazyCompilationPlugin` so the lazy import's namespace shape matches a direct import.
