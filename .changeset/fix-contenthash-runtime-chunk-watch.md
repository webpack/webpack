---
"webpack": patch
---

Fix stale content hash in runtime chunk when using `runtimeChunk: "single"` with `splitChunks` and `contenthash` in watch mode. The chunk hashing order was corrected so that all non-runtime chunks are hashed before the runtime chunk, ensuring `GetChunkFilenameRuntimeModule` always embeds up-to-date content hashes.
