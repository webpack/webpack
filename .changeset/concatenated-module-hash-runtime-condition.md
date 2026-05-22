---
"webpack": patch
---

Include each external info's `runtimeCondition` in `ConcatenatedModule#updateHash` so changes to a concatenated external's runtime condition invalidate persistent caches instead of slipping through with the module id alone.
