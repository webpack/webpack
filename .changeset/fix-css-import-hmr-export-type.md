---
"webpack": patch
---

Fixed HMR failure for CSS modules with @import when exportType !== "link". When exportType is not "link", CSS modules now behave like JavaScript modules and don't require special HMR handling, allowing @import CSS to work correctly during hot module replacement.
