---
"webpack": patch
---

Fix `output.html.inject` edge cases: keep resource hints and entry tags with `inject: false`, inject stylesheets into `<head>` (after `defer`/module script tags, ahead of blocking ones — Vite's order), and locate `<head>` via the HTML parser instead of a text scan.
