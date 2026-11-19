---
"webpack": minor
---

Add a `transport` hook to `webpack.hmr.LazyCompilationPlugin`, so a development server can serve the lazy compilation backend from its own server, and pass the options it settles on to a custom backend, which can bring its own client.
