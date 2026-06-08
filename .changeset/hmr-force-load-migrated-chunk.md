---
"webpack": patch
---

Force-load a module's new owning chunk during HMR when its only loaded chunk is removed from a runtime, so it keeps receiving updates.
