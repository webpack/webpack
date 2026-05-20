---
"webpack": patch
---

Narrow `TemplatePathFn` callback types by context. `pathData.chunk` is now non-optional for chunk filename callbacks (`output.filename`, `chunkFilename`, `cssFilename`, `cssChunkFilename`, `htmlFilename`, `htmlChunkFilename`, `optimization.splitChunks.cacheGroups[*].filename`), and `pathData.module` is non-optional for module filename callbacks (`output.assetModuleFilename`, per-module `generator.filename` / `generator.outputPath`, `module.parser.css.localIdentName`).
