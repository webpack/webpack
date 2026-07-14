---
"webpack": patch
---

Fix `output.html.inject` edge cases: keep resource hints and entry tags with `inject: false`, always inject stylesheets into `<head>` ahead of scripts (aligned with other bundlers), and locate `<head>` via the HTML parser instead of a text scan.
