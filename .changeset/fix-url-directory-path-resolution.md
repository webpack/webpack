---
"webpack": patch
---

Fix `new URL('./', import.meta.url)` and other directory URL paths throwing "Can't resolve" errors. Directory paths (trailing slash) are not module assets and are now handled at runtime relative to the bundle base URI, matching the behavior of `/* webpackIgnore: true */`.
