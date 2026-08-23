---
"webpack": patch
---

Speed up concatenated module renaming by walking the ast on node offsets and indexing double-bound names once.
