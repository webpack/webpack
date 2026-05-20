---
"webpack": minor
---

Narrow `TemplatePathFn` callback types based on context. `TemplatePathFn` is now generic in the `PathData` shape (defaults to the existing loose `PathData`). New `PathDataChunk` and `PathDataModule` typedefs are exposed for callbacks that always receive a chunk or a module. Public option callbacks have been retyped to use the appropriate variant so that, for example, `output.filename`'s `pathData.chunk` is non-optional and `output.assetModuleFilename`'s `pathData.module` is non-optional.

`output.publicPath` keeps the loose `PathData` since it can be interpolated in either context.

Also fixes `AssetResourceGeneratorOptions.filename` and `AssetGeneratorOptions.filename` to reference `AssetModuleFilename` instead of `FilenameTemplate` — they were already used as module-context filenames at runtime; the schema now reflects that.
