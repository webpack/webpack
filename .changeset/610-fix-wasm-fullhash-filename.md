---
"webpack": patch
---

Fix `[fullhash]` in `output.webassemblyModuleFilename` by dropping a stray brace and requesting the `getFullHash` runtime module.
