---
"webpack": minor
---

Safely minify CSS (with source maps) and HTML assets when `optimization.minimize` is enabled, unless a minimizer is already configured for them; CSS also collapses `{1,4}` box and `flex` shorthands, HTML text survives CRLF line endings, and HTML drops quotes a value does not need, whitespace nothing renders, tags the parser re-implies, and source casing the parser folds.
