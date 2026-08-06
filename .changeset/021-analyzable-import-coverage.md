---
"webpack": minor
---

Emit the analyzable `import()` form for chunks that are shared, carry css, have prefetch/preload children, or sit behind an empty public path, which the ESM chunk loader also no longer leaves as a bare specifier.
