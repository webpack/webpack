---
"webpack": patch
---

Fix CSS modules deduplication so a `.module.<ext>` file imported both directly (JS) and via icss (`composes from` / `:import`) becomes a single module instance.
