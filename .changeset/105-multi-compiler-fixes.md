---
"webpack": patch
---

Fix MultiCompiler: compute the common `outputPath` by whole path segments, run again after a dependency validation failure, and recover watch mode from a fatal child error without leaking watchings.
