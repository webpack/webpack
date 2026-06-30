---
"webpack": patch
---

Default `output.globalObject` to `globalThis` for universal (web + node) UMD builds so they can be required in Node.
