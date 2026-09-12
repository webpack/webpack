---
"webpack": patch
---

Expose exports of all entry modules in library output when an entry is an array of modules, instead of only the last entry module's exports (fixes #15936)
