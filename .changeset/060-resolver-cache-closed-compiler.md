---
"webpack": patch
---

Do not throw when a compiler is closed while a cached resolve is still in progress, e.g. after a build with `bail` failed.
