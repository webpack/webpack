---
"webpack": patch
---

Merge `@import`ed CSS at build time for `text` and `css-style-sheet` exportTypes so the bundle ships a single accurate inline source map covering every contributing file. Previously each module's JS literal carried its own inline map and the imports were stitched together at runtime — DevTools only saw the parent's map (with mappings off by the prepended import content) and for `css-style-sheet` the maps were stripped entirely by `replaceSync`. The `cssMergeStyleSheets` runtime helper is no longer needed and has been removed.
