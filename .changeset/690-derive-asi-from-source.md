---
"webpack": patch
---

Derive ASI positions from source text instead of acorn's `onInsertedSemicolon`, so custom parsers need not collect semicolons.
