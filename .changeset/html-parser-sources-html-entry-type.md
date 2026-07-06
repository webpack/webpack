---
"webpack": minor
---

Extend the HTML pipeline with new source types: an `html` link (a custom tag/attribute bundled as its own emitted page) and `rel="preload"`/`"prefetch"` links whose scripts/styles are bundled as chunks and rewritten to the built chunk URL.
