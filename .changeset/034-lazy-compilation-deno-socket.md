---
"webpack": patch
---

Improve Deno compatibility: guard `setNoDelay` and force-close connections on lazy-compilation backend dispose, and return a real `ArrayBuffer` from the Node async/sync wasm loader so `WebAssembly.instantiate` accepts it.
