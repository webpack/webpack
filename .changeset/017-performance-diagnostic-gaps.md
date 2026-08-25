---
"webpack": minor
---

Add performance hints for source maps that cost more than they give, for asset files emitted for an import nothing reads, and for modules kept in the bundle only by a side effect; group the checks for configuration that did nothing under one `unusedConfig` option; report duplicated modules the chunk graph alone could not see; and keep a bare `import` of an asset emitting its file when asset modules are side-effect-free.
