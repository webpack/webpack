---
"webpack": patch
---

Fix `output.html.integrity`: rewrite an authored `integrity` attribute instead of duplicating it, keep the sentinel out of JS chunks so their content hashes stay valid, and report an unsupported hash algorithm as a webpack error instead of crashing.
