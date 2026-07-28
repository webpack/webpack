---
"webpack": patch
---

Delete no longer referenced files from the filesystem cache directory after storing the cache, aging them by recorded time so restored caches are cleaned too.
