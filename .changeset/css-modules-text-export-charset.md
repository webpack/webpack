---
"webpack": patch
---

Preserve `@charset` at-rule when CSS modules use `exportType: "text"`. The charset is now prepended to the exported text at build time. When a text module imports another text module, the inner `@charset` directives are kept (CSS parsers honor only the first one at byte 0 and ignore the rest).
