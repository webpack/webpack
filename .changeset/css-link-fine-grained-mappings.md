---
"webpack": patch
---

Map each generated CSS-module class export line in the JS bundle back to its selector position in the original CSS file (e.g. `btn: "..."` → `.btn { ... }`), rather than only embedding the generated wrapper as `sourcesContent`. Brings JS source-map fidelity for the built-in CSS feature in line with what `css-loader` produces.
