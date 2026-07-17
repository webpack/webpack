---
"webpack": patch
---

Fix deferred-namespace evaluation errors: re-throw a deferred module's cached evaluation error, and throw when forcing evaluation of an already-evaluating module.
