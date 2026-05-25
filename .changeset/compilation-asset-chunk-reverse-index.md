---
"webpack": patch
---

Speed up `Compilation.deleteAsset` and `Compilation.renameAsset` via a lazy reverse index from asset file name to containing chunks.
