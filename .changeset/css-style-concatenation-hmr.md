---
"webpack": patch
---

Fix HMR for concatenated CSS modules with `style` exportType by using stable per-module identifiers for injected style elements and tracking inner module IDs of concatenated modules in HMR records
