---
"webpack": minor
---

Add `optimization.anonymousDefaultExportName` option to control whether webpack sets `.name` to `"default"` for anonymous default export functions and classes per ES spec. Defaults to `false` to avoid unnecessary bundle size overhead. Set to `true` for strict ES spec compliance.
