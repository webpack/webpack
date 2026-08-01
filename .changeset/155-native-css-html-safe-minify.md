---
"webpack": minor
---

Safely minify CSS (with source maps) and HTML assets when `optimization.minimize` is enabled, unless a minimizer is already configured for them; CSS shortens colors, numbers, easing functions, quoting and escapes and drops empty rules and insignificant query whitespace, and HTML collapses opening-tag whitespace.
