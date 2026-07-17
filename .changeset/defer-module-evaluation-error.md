---
"webpack": patch
---

Fix deferred-namespace evaluation errors: re-throw a deferred module's cached evaluation error, and throw when forcing evaluation of a module (or one of its transitive static dependencies) that is still evaluating.
