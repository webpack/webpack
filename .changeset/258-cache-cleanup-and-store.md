---
"webpack": patch
---

The filesystem cache deletes only its own pack files when it cleans up the cache directory, and it still stores a pack after part of it could not be restored.
