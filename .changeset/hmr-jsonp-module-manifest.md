---
"webpack": patch
---

Fix broken HMR with `output.module` and non-`import` chunk loading (e.g. jsonp/array-push) by emitting a plain-JSON hot-update manifest.
