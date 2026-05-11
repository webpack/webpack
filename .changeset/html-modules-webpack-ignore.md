---
"webpack": minor
---

Support the `webpackIgnore: true` magic comment in HTML modules. Placing `<!-- webpackIgnore: true -->` immediately before a tag tells webpack not to resolve any of that tag's `src`/`href`/`srcset`/… URLs and leave them untouched in the output, matching the behavior already provided by `html-loader`.
