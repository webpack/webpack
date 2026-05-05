---
"webpack": patch
---

Preserve `@charset` at-rule when CSS modules use `exportType: "text"`. The charset is now prepended to the exported text, and any duplicate `@charset` from concatenated text imports is stripped.
