---
"webpack": minor
---

Add `module.generator.javascript.anonymousDefaultExportName` option to control whether webpack sets `.name` to `"default"` for anonymous default export functions and classes per ES spec. Defaults to `true` for applications and `false` for libraries (when `output.library` is set) to avoid unnecessary bundle size overhead. Also extract anonymous default export `.name` fix-up into a shared runtime helper (`__webpack_require__.dn`), replacing repeated inline `Object.defineProperty` / `Object.getOwnPropertyDescriptor` calls with a single short call per module to reduce output size.
