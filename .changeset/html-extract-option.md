---
"webpack": minor
---

Add `module.generator.html.extract` (default `false`) and `module.generator.html.filename` (default `[name].html`) options for HTML modules. When `extract` is enabled, the parsed and URL-rewritten HTML is emitted as a standalone `.html` output file alongside the JavaScript export.

Also fix `<script src>` / `<link rel="modulepreload">` references inside HTML modules to load every chunk in the referenced entry — including runtime chunks split off by `optimization.runtimeChunk` and split chunks created by `optimization.splitChunks` — instead of only the entry chunk.
