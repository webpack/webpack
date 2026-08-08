---
"webpack": minor
---

Patch the HTML `<head>` in place on hot update instead of forcing a full reload, including when a `<script>` that never executed is removed.
