---
"webpack": patch
---

Fix `output.html.inject` edge cases: keep resource hints and entry tags with `inject: false`, keep CSS before scripts with `inject: "head"`, and locate `<head>` via the HTML parser instead of a text scan.
