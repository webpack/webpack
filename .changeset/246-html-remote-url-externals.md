---
"webpack": patch
---

Keep absolute remote URLs (`<img src="https://…">`, `srcset`, `poster`, …) in HTML as written instead of emitting `data:,` when `externalsPresets.web` turns them into externals, re-encoding any character references they contain.
