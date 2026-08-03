---
"webpack": minor
---

Safely minify CSS (with source maps) and HTML assets when `optimization.minimize` is enabled, unless a minimizer is already configured for them; CSS also collapses `{1,4}` box and `flex` shorthands, four box longhands into the shorthand they are, a `font-weight` keyword into its number, a CSS2 pseudo-element's redundant colon and the universal selector a compound implies, `translateX()`, a zero length's unit, an identical repeated declaration, an `hsl()` that converts without rounding, and the whitespace a math function's `*` and `/` do not need.
