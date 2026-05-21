---
"webpack": patch
---

Resolve `[contenthash]` / `[chunkhash]` / `[fullhash]` in chunk filenames embedded into extracted HTML, and invalidate the HTML's own `[contenthash]` when those resolved URLs change.
