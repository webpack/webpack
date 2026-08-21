---
"webpack": minor
---

Emit analyzable ESM output: chunk imports, lazy context requests, asset, stylesheet and WebAssembly urls, worker references and prefetch/preload urls are written out as static `import()` / `new URL(..., import.meta.url)` so tools can follow them.
