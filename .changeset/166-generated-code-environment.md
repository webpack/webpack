---
"webpack": patch
---

Respect `output.environment` in the wasm loaders, the ESM chunk header and the analyzable `import()`, and stop a universal target choosing ESM output it cannot read or a global object only one of its platforms defines.
