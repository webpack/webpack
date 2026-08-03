---
"webpack": minor
---

Minify CSS and HTML further where the document is unchanged: CSS rounds a number to 6 significant digits, rewrites a length or time into the shortest unit it is exactly equal in, converts every polar and Lab color function to hex where the engine agrees, merges four box longhands with unrelated declarations between them, and keeps a `@supports` condition as written; HTML normalizes each attribute against the element it is on.
