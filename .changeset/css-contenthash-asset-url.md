---
"webpack": patch
---

Recompute the CSS chunk's `[contenthash]` and the rendered CSS bytes when an asset referenced by `url()`/`src()`/string in CSS changes its hashed filename.
