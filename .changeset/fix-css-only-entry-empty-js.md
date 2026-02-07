---
"webpack": patch
---

Fixed an issue where empty JavaScript files were generated for CSS-only entry points. The code now correctly checks if entry modules have JavaScript source types before determining whether to generate a JS file.
