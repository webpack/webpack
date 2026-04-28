---
"webpack": minor
---

Support source-phase imports for JavaScript modules. With the
`experiments.sourceImport` option enabled, `import source X from "./mod.js"`
and `import.source("./mod.js")` bind to an opaque module reflection (a frozen
object whose `Symbol.toStringTag` is `"Module"`) instead of evaluating the
imported module. This mirrors the existing source-phase support for async
WebAssembly modules and aligns with the TC39 source-phase imports proposal.
