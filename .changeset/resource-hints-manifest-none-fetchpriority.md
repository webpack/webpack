---
"webpack": minor
---

Add `output.resourceHintsManifest` (write per-entry hints to a JSON file for SSR), `output.resourceHints: "none"` (hard off switch), and `fetchPriority` on `HtmlResourceHint` descriptors (emitted on prefetch too).
