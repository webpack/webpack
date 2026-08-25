---
"webpack": minor
---

Add performance hints for loaders that drop the source map they were given and for asset files emitted for an import nothing reads, and keep a bare `import` of an asset emitting its file when asset modules are side-effect-free.
