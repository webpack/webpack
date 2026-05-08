---
"webpack": minor
---

Add `"module-sync"` to default `conditionNames` for resolver defaults to align with Node.js, which exposes the `module-sync` community condition for synchronously-loadable ESM. Affects ESM, CJS, AMD, worker, wasm and build-dependency resolvers.
