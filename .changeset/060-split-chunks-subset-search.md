---
"webpack": patch
---

Speed up SplitChunksPlugin: reject non-subset chunk sets with 64-bit signatures, cache unnamed entry keys, and drop per-module closures.
