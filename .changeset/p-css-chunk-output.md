---
"webpack": patch
---

Fix CSS output: a chunk declares `@charset "UTF-8"`, a scoped grid area name keeps its escapes, a `url()` with modifiers keeps its string quoted, placeholder-like source text is kept, an `@import` media query with a stray `}` cannot close a wrapper, a module ending inside a comment, string or block is closed before the next one, a `@value` url() is resolved where it is used, and a file imported `with { type: "css" }` is parsed as CSS.
