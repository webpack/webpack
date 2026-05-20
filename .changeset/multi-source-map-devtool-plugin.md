---
"webpack": patch
---

Allow `devtool` and `SourceMapDevToolPlugin` (or multiple `SourceMapDevToolPlugin` instances) to coexist on the same asset. Previously the second instance would silently skip any asset whose `info.related.sourceMap` had already been set by an earlier instance, and even when it ran the asset had been rewrapped as a `RawSource` so no source map could be recovered — producing an empty `.map` file. The plugin now keeps a per-compilation stash of pristine source maps, namespaces its persistent cache entries by the options that affect output, and appends additional `related.sourceMap` entries instead of overwriting them. The classic workaround of pairing `devtool: 'hidden-source-map'` with a `new webpack.SourceMapDevToolPlugin({ filename: '[file].secondary.map', noSources: true })` now produces both maps in a single build.
