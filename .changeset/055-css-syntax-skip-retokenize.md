---
"webpack": patch
---

Speed up non-modules CSS parsing: skip redundant token re-reads, drop selector-prelude tokens without materializing nodes, allocate rule preludes lazily, and fast-path empty list seals.
