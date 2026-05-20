---
"webpack": minor
---

Add `linkInsert` hook to `CssLoadingRuntimeModule.getCompilationHooks(compilation)` so plugin developers can control where stylesheet `<link>` elements are inserted into the document.
