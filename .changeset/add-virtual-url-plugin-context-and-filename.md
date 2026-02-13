---
"webpack": minor
---

Add `context` option support for VirtualUrlPlugin

- Add `context` option to VirtualUrlPlugin virtual module configuration (boolean | string | function)
- Support custom context path for resolving relative imports in virtual modules
- Allow dynamic context resolution via function based on resource
- Add examples demonstrating context usage and filename customization
