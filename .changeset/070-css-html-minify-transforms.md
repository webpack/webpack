---
"webpack": minor
---

Minify CSS and HTML further where the document is unchanged: CSS rounds a number to 6 significant digits, rewrites a length or time into the shortest unit it is exactly equal in, folds `calc()` and every math function the spec's grammars name except `calc-size()` over constants whose result is exact, down to the sum of unlike units it reduces to, converts every polar and Lab color function to hex where the engine agrees, merges four box longhands with unrelated declarations between them, and keeps a `@supports` condition as written; HTML normalizes each attribute against the element it is on.
