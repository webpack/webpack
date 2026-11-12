---
"webpack": patch
---

Fix the persistent cache ignoring a content change whose file timestamp was kept, e.g. a file restored from an archive or replaced by a rename carrying the old time. With `snapshot: { timestamp: true, hash: true }` the recorded content hash now decides the validation, as the configuration reference documents.
