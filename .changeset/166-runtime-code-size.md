---
"webpack": patch
---

Emit less runtime code: shorter syntax where `output.environment` allows, no IIFE for a `RuntimeModule` without locals, no unread `__webpack_esm_id__` and `exports.id` chunk exports, and an ESM entry chunk installing its own modules from its local bindings instead of importing itself.
