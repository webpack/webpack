---
"webpack": minor
---

Safely minify CSS (with source maps) and HTML assets when `optimization.minimize` is enabled, unless a minimizer is already configured for them; CSS shortens colors, numbers, easing functions, quoting, escapes and `{1,4}` box / `flex` shorthands and drops empty rules and insignificant query whitespace, and HTML collapses opening-tag whitespace.
