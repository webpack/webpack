---
"webpack": patch
---

Keep minified and built HTML and CSS reading as their source: attributes, script and style bodies, escapes, `url()` strings, `@charset` and values left open at the end of the input are kept, and a file imported `with { type: "css" }` is parsed as CSS.
