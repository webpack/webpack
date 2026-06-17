---
"webpack": patch
---

Reduce CSS parser CPU (hoisted per-call regexes, byte-compared `@container` pure-mode keywords) and stop retaining parsed comments on the reused parser instance between modules.
