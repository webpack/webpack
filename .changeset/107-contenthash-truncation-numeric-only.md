---
"webpack": patch
---

Fix a truncated `[contenthash:N]` (chunk filenames, the runtime chunk-filename map, and `RealContentHashPlugin`'s recomputed hash) being able to come out all-digit even though the untruncated hash is guaranteed not to be. An all-digit hash can collide with, and corrupt, a plain numeric literal elsewhere in the bundle when `RealContentHashPlugin` rewrites references to it.
