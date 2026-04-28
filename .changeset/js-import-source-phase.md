---
"webpack": minor
---

Implement source-phase imports for JavaScript modules per the TC39
[source-phase imports proposal](https://github.com/tc39/proposal-source-phase-imports).
With `experiments.sourceImport` enabled, `import source X from "./mod.js"` and
`await import.source("./mod.js")` bind to a `ModuleSource` reflection — an
opaque, frozen object whose `Symbol.toStringTag` is `"Module"` (mirroring the
proposal's `%AbstractModuleSource%` intrinsic). The imported module is **not
evaluated** as a side effect of the source-phase import; repeated source-phase
imports of the same module return the same `ModuleSource` instance via a new
runtime helper (`__webpack_require__.zS`).

Source-phase imports for asynchronous WebAssembly modules continue to expose
the underlying `WebAssembly.Module`. The static form is also validated at
compile time to require the default-binding shape (`import source name from '...'`).
