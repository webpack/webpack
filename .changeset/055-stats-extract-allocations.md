---
"webpack": patch
---

Speed up stats generation and cut its peak memory: reuse cached sort comparators instead of thrashing the comparator caches on every sort, and drop redundant module-graph lookups and allocations in the extractors.
