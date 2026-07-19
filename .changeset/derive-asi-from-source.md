---
"webpack": patch
---

Derive ASI positions from the source text instead of acorn's onInsertedSemicolon, so custom parsers no longer need to collect semicolons.
