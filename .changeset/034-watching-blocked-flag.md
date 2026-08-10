---
"webpack": patch
---

Clear a `Watching`'s `blocked` flag when its build starts, so it reports only a child actually waiting for its MultiCompiler parent.
