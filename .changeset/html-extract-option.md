---
"webpack": minor
---

Add `module.generator.html.extract` for HTML modules and the matching `output.htmlFilename` / `output.htmlChunkFilename` filename templates (defaults derived from `output.filename` / `output.chunkFilename` with `.js` swapped for `.html`, mirroring the CSS pipeline). When extraction is on, the parsed and URL-rewritten HTML is emitted as a standalone `.html` output file alongside the module's JavaScript export.
