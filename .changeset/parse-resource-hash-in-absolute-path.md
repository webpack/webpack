---
"webpack": patch
---

Treat `#` in an absolute path's directory name as part of the path rather than a fragment separator. `parseResource` and resolver requests now correctly handle absolute paths containing `#`, so projects in directories like `/home/user/proj#1` (and tools like webpack-dev-server that build absolute entry requests with query strings) resolve correctly.
