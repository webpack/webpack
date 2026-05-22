---
"webpack": patch
---

Reduce peak memory usage of `SourceMapDevToolPlugin` on large builds:

- Emit the external `.map` asset as a `Buffer` instead of a V8 string. The emitted asset lives in `compilation.assets` for the rest of the build, so storing its bytes as off-heap external memory keeps the JSON content out of the V8 heap and avoids holding the same content twice when V8 internally widens it.
- After extracting the source map for each asset, call `Source#clearCache` (`webpack-sources` 3.5+) on the asset's source tree to release the composed map and parsed `SourceMapSource` representations that `sourceAndMap()` cached. Calls share a single `WeakSet` across all chunks so module sources shared between chunks are walked at most once.

Requires `webpack-sources` ^3.5.0.

See issue #20961.
