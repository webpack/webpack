---
"webpack": patch
---

Keep `#` characters inside absolute path segments when parsing a resource. A `#` followed by a path separator (`/` or `\`) is now treated as part of the path rather than a fragment marker, so projects located in directories whose names contain `#` resolve correctly.
