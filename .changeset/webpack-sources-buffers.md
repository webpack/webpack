---
"webpack": patch
---

Bump `webpack-sources` to `^3.4.1` and feed asset bytes into hashes via the new `Source.prototype.buffers()` API. For large `ConcatSource`/`ReplaceSource` outputs this avoids the intermediate `Buffer.concat` that `source.buffer()` performs, removing a peak-memory spike equal to the source's total size on each hashed asset (`AssetGenerator.getFullContentHash`, `CssIcssExportDependency` content hashing, and `RealContentHashPlugin`). A small benchmark on a 64 MiB `ConcatSource` shows ~64 MiB lower peak external memory and ~45% faster hashing.
