---
"webpack": minor
---

Honor the TC39 source-phase imports proposal for JavaScript modules. With
`experiments.sourceImport` enabled, both static `import source X from "./mod.js"`
and dynamic `import.source("./mod.js")` now throw a `SyntaxError` at runtime
when the imported module is a JavaScript source-text module (matching V8 and
the test262 `source-phase-imports` cases). The existing source-phase support
for asynchronous WebAssembly modules is unchanged.

`import source X from "./mod.js"` is also validated at compile time to require
the default-binding form (`import source name from '...'`).
