---
"webpack": patch
---

Default `output.globalObject` to `globalThis` for universal (web + node) non-ESM library builds so UMD and global bundles can be required in Node.
