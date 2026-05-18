---
"webpack": minor
---

Add `module.generator.html.extract` (default `false`) and the matching `output.htmlFilename` / `output.htmlChunkFilename` filename templates (defaults derived from `output.filename` / `output.chunkFilename` with `.js` swapped for `.html`, mirroring the CSS pipeline) for HTML modules. When `extract` is enabled, the parsed and URL-rewritten HTML is emitted as a standalone `.html` output file alongside the module's JavaScript export, in preparation for first-class HTML entry points.

Also fix `<script src>` / `<link rel="modulepreload">` references inside HTML modules to load every chunk in the referenced entry — including runtime chunks split off by `optimization.runtimeChunk` and shared chunks created by `optimization.splitChunks` — instead of only the entry chunk.
