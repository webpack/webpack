---
"webpack": patch
---

Fix `||` default value handling in ProgressPlugin and ManifestPlugin that incorrectly overrode user-provided falsy values (e.g. `modules: false`, `entries: false`, `entrypoints: false`).
