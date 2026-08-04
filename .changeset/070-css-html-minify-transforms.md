---
"webpack": minor
---

Minify CSS and HTML further where the document is unchanged: CSS rounds a number to 6 significant digits, rewrites a time into the shorter of `ms` / `s`, folds `calc()` and every math function the spec's grammars name over constants whose result is exact, reducing `calc-size()`'s size in place, down to the sum of unlike units it reduces to, takes the parentheses off a folded negative where the property accepts one, drops a zero's unit inside a call whose every number is a length, converts every polar and Lab color function to hex where the engine agrees, merges four box longhands with unrelated declarations between them — sides or corners — the two a pair shorthand sets, and the slots of an order-free one where each value parses back into its own, collapses an `and` of two one-sided media-feature ranges into the interval it describes, and keeps a `@supports` condition as written; HTML normalizes each attribute against the element it is on.
