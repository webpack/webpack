---
"webpack": patch
---

Treat `#` in an absolute path's directory name as part of the path rather than a fragment separator, so projects in directories like `/home/user/proj#1` resolve correctly.
