---
"webpack": minor
---

Add `SSRManifestPlugin`, emitting a source-module to client-asset manifest whose stylesheets are listed in cascade order, and collect server styles on document-less targets such as `target: "node"`.
