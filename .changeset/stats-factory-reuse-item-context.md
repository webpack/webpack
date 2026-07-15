---
"webpack": patch
---

Speed up stats generation on large builds by reusing the item context across array items instead of re-spreading it per item.
