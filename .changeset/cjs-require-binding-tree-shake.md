---
"webpack": patch
---

Tree-shake CommonJS modules imported through a `const NAME = require(LITERAL)` binding when only static members of `NAME` are read. Previously webpack treated every export of such modules as referenced (because the bare `require()` dependency reports `EXPORTS_OBJECT_REFERENCED`), so unused `exports.x = ...` assignments remained in the bundle even with `usedExports` enabled. The parser now forwards `NAME.x` / `NAME.x()` / `NAME["x"]` accesses to the underlying `CommonJsRequireDependency` as referenced exports, falling back to the full exports object the moment `NAME` is read in any other context (passed by value, destructured later, accessed with a dynamic key, …). This brings the binding form to parity with the existing destructuring form (`const { x } = require(...)`).
