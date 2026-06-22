---
"webpack": patch
---

Reduce CSS build time and memory usage. Per-export CSS dependencies are consolidated into one dependency per module, and hot-path allocations and lookups in CSS code generation and the module-graph cache are trimmed.
