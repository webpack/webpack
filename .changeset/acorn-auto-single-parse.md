---
"webpack": patch
---

Avoid a second full parse for `auto` source type by downgrading module to script in place on a top-level return.
