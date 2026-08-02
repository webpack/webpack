---
"webpack": minor
---

Safely minify CSS (with source maps) and HTML assets when `optimization.minimize` is enabled, unless a minimizer is already configured for them; CSS also collapses `{1,4}` box and `flex` shorthands, and HTML text survives CRLF line endings.
