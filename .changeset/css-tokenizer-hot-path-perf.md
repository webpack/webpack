---
"webpack": patch
---

Speed up CSS tokenization by trimming redundant char-code reads, lookups, and per-node allocations on the hot path.
