---
"webpack": minor
---

Re-encode inline hash digests (`[contenthash]`/`[chunkhash]`/`[fullhash]`/`[modulehash]`) from the full content hash, so they carry full entropy and work under `optimization.realContentHash` and in dynamically-loaded chunk filenames; also preserve leading zero bytes in base-N digests.
