---
"webpack": patch
---

Fix VirtualUrlPlugin to set resourceData.context for proper module resolution. Previously, when context was not set, it would fallback to the virtual scheme path (e.g., `virtual:routes`), which is not a valid filesystem path, causing subsequent resolve operations to fail.
