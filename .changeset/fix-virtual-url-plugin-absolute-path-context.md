---
"webpack": patch
---

fix: VirtualUrlPlugin absolute path virtual module IDs getting concatenated with compiler context

When a virtual module ID is an absolute path (e.g. `virtual:C:/project/user.js`), the auto-derived context was incorrectly joined with `compiler.context`, producing a concatenated path like `C:\cwd\C:\project`. Now absolute-path contexts are used directly.
