---
"webpack": patch
---

Embed an inline `sourceMappingURL` data URI inside the CSS when the `parser.exportType` option are `text`, `style`, or `css-style-sheet`. Also merge `@import`ed CSS at build time for `text` and `css-style-sheet` exportTypes so the bundle ships a single accurate inline source map covering every contributing file. Map each generated CSS-module class export line in the JS bundle back to its selector position in the original CSS file (e.g. `btn: "..."` → `.btn { ... }`).
