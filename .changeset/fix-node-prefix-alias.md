---
"webpack": patch
---

Fix `resolve.alias` and `resolve.fallback` for `node:` prefixed requests to allow aliasing them to `false` to ignore the module.
