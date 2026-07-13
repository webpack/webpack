---
"webpack": patch
---

Fix named id assignment reusing an already-used numbered suffix (e.g. from records or pre-assigned ids), which could produce duplicate module/chunk ids.
