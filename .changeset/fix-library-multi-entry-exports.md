---
"webpack": patch
---

Fix library output only exposing exports from the last entry module when multiple entry files are specified. All entry modules now contribute their exports to the library.
