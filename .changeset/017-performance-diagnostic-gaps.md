---
"webpack": minor
---

Add a performance hint for loaders that drop the source map they were given, and keep a bare `import` of an asset emitting its file when asset modules are side-effect-free.
