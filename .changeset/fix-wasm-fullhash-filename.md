---
"webpack": patch
---

Fix `[fullhash]` in `output.webassemblyModuleFilename`: drop the stray brace in the emitted runtime code and request the `getFullHash` runtime module.
