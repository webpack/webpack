---
"webpack": patch
---

Re-export `ModuleNotFoundError` from `webpack/lib/ModuleNotFoundError` for backward compatibility with old plugins that import it from that path. This re-export will be removed in webpack 6.
