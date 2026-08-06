---
"webpack": minor
---

Emit the analyzable `import()`/`new URL()` form for chunks that are shared, carry css, have prefetch/preload children, sit behind an empty public path, or are loaded from an ESM worker; drop the chunk filename lookup for workers referenced from several output depths; and stop the ESM chunk loader leaving a bare specifier.
