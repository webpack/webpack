---
"webpack": patch
---

Fix `CompatibilityPlugin` to correctly rename `__webpack_require__` when it appears as an arrow function parameter (e.g. `(__webpack_module, __webpack_exports, __webpack_require__) => { ... }`).
