---
"webpack": minor
---

Allow asynchronous modules (top-level-await ESM, async `import`/`script`/`promise` externals, and async WebAssembly) to participate in `optimization.concatenateModules`. The resulting `ConcatenatedModule` is itself marked async and renders an outer `__webpack_require__.a(module, async (handle, result) => { … })` wrapper; concatenated externals that resolve to a Promise are unwrapped through `__webpack_handle_async_dependencies__`, and async WebAssembly modules inline their `await __webpack_require__.v(…)` instantiation into that wrapper. `Generator.byType` now defers `getConcatenationBailoutReason` to the JavaScript-typed generator in the map so the async wasm generator can opt in.
