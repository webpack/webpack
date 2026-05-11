---
"webpack": minor
---

Add `linkInsert` hook to `CssLoadingRuntimeModule.getCompilationHooks(compilation)` so plugin developers can control where stylesheet `<link>` elements are inserted into the document. The hook receives the default insertion source (`document.head.appendChild(link);`) and the chunk, and returns the JS used to attach the link.
