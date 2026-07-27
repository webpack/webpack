---
"webpack": minor
---

Wrap concatenated modules in lazy `__webpack_require__.cw` accessors and inline `require()` edges. A `require()` target and its whole transitive dependency closure are wrapped together, so nothing a lazily evaluated member depends on is scope-hoisted ahead of it. Set `optimization.concatenateModules: { commonjs: false }` to opt out of both.
