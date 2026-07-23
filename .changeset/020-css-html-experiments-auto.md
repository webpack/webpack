---
"webpack": minor
---

Default `experiments.css`, `experiments.html` and `experiments.asyncWebAssembly` to `"auto"`, enabling built-in support unless a loader is registered for those files; modules with inline or hook-injected loaders (e.g. html-webpack-plugin templates) keep being parsed as JavaScript.
