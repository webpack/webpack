---
"webpack": patch
---

Wrap the JS emit of CSS modules with `exportType: "link"` (the default) in an `OriginalSource` so the bundle's JS source map maps the generated `module.exports = { className: "hash" }` lines back to the CSS module's identifier, matching the behaviour of other CSS export types.
