---
"webpack": minor
---

Emit the analyzable `import()` form for chunks that are shared, carry css, have prefetch/preload children, sit behind an empty public path, or are loaded from an ESM worker, and stop the ESM chunk loader leaving a bare specifier.
