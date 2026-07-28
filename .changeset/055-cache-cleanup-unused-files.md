---
"webpack": patch
---

Delete no longer referenced files from the filesystem cache directory after storing the cache, age them by recorded time so restored caches are cleaned too, and collect every fully expired pack in one store instead of one per build.
