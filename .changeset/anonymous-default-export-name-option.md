---
"webpack": minor
---

Add `module.generator.javascript.anonymousDefaultExportName` option to control whether webpack sets `.name` to `"default"` for anonymous default export functions and classes per ES spec. Defaults to `true` for applications and `false` for libraries (when `output.library` is set) to avoid unnecessary bundle size overhead.
