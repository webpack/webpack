---
"webpack": patch
---

Fix two ES5-environment regressions in the anonymous default export `.name` fix-up: the generated code referenced an undeclared `__WEBPACK_DEFAULT_EXPORT__` binding causing `ReferenceError`, and used `Reflect.defineProperty` which is not available in pre-ES2015 runtimes. The fix-up now references the real assignment target and uses `Object.defineProperty` / `Object.getOwnPropertyDescriptor`.
