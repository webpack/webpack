---
"webpack": minor
---

Allow synchronous WebAssembly modules to participate in `optimization.concatenateModules`. The JavaScript wrapper for a `webassembly/sync` module is now inlined into its consumer when both end up in the same chunk; the wasm binary is still emitted as a separate asset. Generators created via `Generator.byType` defer the concatenation bailout decision to the JavaScript-typed generator in the map.
