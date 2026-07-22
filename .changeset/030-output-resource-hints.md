---
"webpack": minor
---

Add `output.resourceHints` to emit resource hints (`preload`/`prefetch`/`modulepreload`/`preconnect`), on by default for ESM output, plus `module.parser.<type>.urlHints`, `css.fontPreload` and `javascript.dynamicImportCssPreload`.
