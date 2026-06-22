---
"webpack": patch
---

Allow output.path to be the filesystem root by treating EISDIR like EEXIST in mkdirp.
