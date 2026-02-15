---
"webpack": patch
---

Fix crash in createHash when using Web Workers with runtimeChunk optimization. The async entrypoint's chunk may not be a runtime chunk, so skip non-runtime chunks when building the runtime chunk dependency graph.
