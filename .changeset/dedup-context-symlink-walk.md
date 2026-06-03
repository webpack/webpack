---
"webpack": patch
---

Skip already-visited symlink targets when resolving context hashes so cyclic symlink graphs no longer overflow the queue.
