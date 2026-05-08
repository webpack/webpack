---
"webpack": minor
---

Preserve `defer` / `source` import phase keywords on external dependencies in ESM output, the same way import attributes are preserved. Static `import defer * as ns from "x"` and `import source v from "x"` against a `module` external are now emitted as native `import defer * as …` / `import source … from …` statements at the top of the bundle, and dynamic `import.defer("x")` / `import.source("x")` against an `import` external is emitted as `import.defer(…)` / `import.source(…)`.
