---
"webpack": patch
---

Use compiler context instead of module context for CSS modules local ident hashing to avoid hash collisions when files with the same name exist in different directories.
