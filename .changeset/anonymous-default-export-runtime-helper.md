---
"webpack": patch
---

Extract anonymous default export `.name` fix-up into a shared runtime helper (`__webpack_require__.dn`), replacing repeated inline `Object.defineProperty` / `Object.getOwnPropertyDescriptor` calls with a single short call per module to reduce output size.
