---
"webpack": minor
---

Add `context` option support for VirtualUrlPlugin

- The context for the virtual module. A string path. Defaults to 'auto', which will try to resolve the context from the module id.
- Support custom context path for resolving relative imports in virtual modules
- Add examples demonstrating context usage and filename customization
