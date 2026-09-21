---
"webpack": minor
---

Reduce `css.syntax` and `html.syntax` to `parser`, `printer` and
`SourceProcessor`; reach the rest through `util.dataURL`, `css.cssMinify`,
`html.htmlMinify` and `html.builtinEmbeddedRenderer`.
