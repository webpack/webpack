---
"webpack": patch
---

Rewrite `NormalModule#getSideEffectsConnectionState` walk as an allocation-light iterative loop instead of a generator trampoline, restoring rebuild performance lost in #20993 while keeping deep import chains stack-safe.
