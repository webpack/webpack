---
"webpack": patch
---

CSS @import now inherits the parent module's exportType, so a file configured as "text" correctly creates a style tag when @imported by a "style" parent.
