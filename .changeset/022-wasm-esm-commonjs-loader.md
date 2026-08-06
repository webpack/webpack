---
"webpack": patch
---

Load WebAssembly with `import()` whenever the output is an ES module, instead of emitting `require()` into it.
