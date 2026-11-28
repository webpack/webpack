---
"webpack": patch
---

Reuse decoded module references, incoming connections, concatenation lists and unchanged inner-module scope analysis when concatenating modules, with fewer allocations.
