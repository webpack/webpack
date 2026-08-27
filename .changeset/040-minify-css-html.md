---
"webpack": minor
---

Safely minify CSS (with source maps) and HTML assets when `optimization.minimize` is enabled, unless a minimizer is already configured for them, making only transformations an engine cannot tell apart. Every rewrite is named as an option, so it can be switched off.
