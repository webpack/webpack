---
"webpack": minor
---

Add a `transport` hook to `webpack.hmr.LazyCompilationPlugin`, so a development server can serve the lazy compilation backend from its own server or replace it, client included.
