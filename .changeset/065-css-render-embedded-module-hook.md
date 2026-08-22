---
"webpack": minor
---

Add a `CssModulesPlugin` `renderEmbeddedModule` hook, so a sheet embedded into a JS bundle by `exportType` `style` or `text` can be minified — the asset minimizer never sees it.
