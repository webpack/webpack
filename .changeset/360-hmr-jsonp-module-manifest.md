---
"webpack": patch
---

Fix broken HMR with `output.module` and non-`import` chunk loading by emitting a plain-JSON hot-update manifest.
