---
"webpack": patch
---

Fix a persistent filesystem cache restore crash (or data corruption) when a content section starts exactly on a content-buffer boundary in a large multi-buffer cache file.
