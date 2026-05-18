---
"webpack": minor
---

Add `module.generator.html.extract` for HTML modules and the matching `output.htmlFilename` / `output.htmlChunkFilename` filename templates (defaults derived from `output.filename` / `output.chunkFilename` with `.js` swapped for `.html`, mirroring the CSS pipeline). When extraction is on, the parsed and URL-rewritten HTML is emitted as a standalone `.html` output file alongside the module's JavaScript export.

When `extract` is left unset, it defaults to `true` for HTML modules used as compilation entries (HTML entry points) and to `false` for HTML modules imported from JavaScript — so `entry: "./page.html"` just works.

Also fix `<script src>` / `<link rel="modulepreload">` references inside HTML modules to load every chunk in the referenced entry — including runtime chunks split off by `optimization.runtimeChunk` and shared chunks created by `optimization.splitChunks` — instead of only the entry chunk.
