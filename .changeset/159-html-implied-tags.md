---
"webpack": minor
---

Leave out the implied `<html>` start tag when minifying, and add `optimization.minimize.html.removeImpliedTags` to keep it or to leave out `<head>` and `<body>` as well.
