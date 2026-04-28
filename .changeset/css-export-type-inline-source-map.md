---
"webpack": patch
---

Embed an inline `sourceMappingURL` data URI inside the CSS string emitted for `parser.exportType` `text`, `style`, and `css-style-sheet` so DevTools can map the applied stylesheet back to its original sources (matching the behavior of `css-loader` + `style-loader`). Previously the original CSS source map was attached to the JS string literal, where the line/column information no longer matched after `JSON.stringify` collapsed the CSS onto a single line, so DevTools could not display the original source for CSS modules consumed via these export types.
