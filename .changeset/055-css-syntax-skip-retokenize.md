---
"webpack": patch
---

Speed up CSS parsing: skip redundant token re-reads and, in non-modules mode, drop selector-prelude tokens without materializing a node.
