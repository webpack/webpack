---
"webpack": patch
---

Optimize source map generation: only include `ignoreList` property when it has content, avoiding empty arrays in source maps.
