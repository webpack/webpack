---
"webpack": patch
---

Speed up serialization deserialize by replacing a Buffer.isBuffer call with a typeof check.
