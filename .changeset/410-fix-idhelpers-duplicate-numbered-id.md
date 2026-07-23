---
"webpack": patch
---

Fix named id assignment reusing an already-used numbered suffix, which could produce duplicate module/chunk ids.
