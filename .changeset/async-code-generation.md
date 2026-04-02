---
"webpack": minor
---

Support async code generation in Generator and Module. `Generator.generate()` and `Module.codeGeneration()` can now return a Promise, enabling post-generation processing such as CSS minimization via multi-process workers after a module's source type is generated.
