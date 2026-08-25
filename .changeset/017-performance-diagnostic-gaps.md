---
"webpack": minor
---

Add performance hints for loaders that drop the source map they were given, for asset files emitted for an import nothing reads, and for modules kept in the bundle only by a side-effect statement, and keep a bare `import` of an asset emitting its file when asset modules are side-effect-free.
