---
"webpack": patch
---

Resolve `[hash]`/`[fullhash]` placeholders in `output.publicPath` (including function publicPaths that reference `pathData.hash`) when generating `url()` references for `experiments.css`. Previously these produced broken URLs containing `undefined` or an un-substituted `[hash]` placeholder because the compilation hash was not yet available at code generation time.
