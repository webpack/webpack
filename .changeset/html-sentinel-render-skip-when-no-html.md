---
"webpack": patch
---

Skip the HTML sentinel-resolve render pass over JS chunks when the compilation has no HTML modules, avoiding per-chunk source materialization in JS-only builds.
