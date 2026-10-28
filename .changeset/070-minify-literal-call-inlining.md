---
"webpack": patch
---

Inline a function read once into its call inside an array or object literal, and fold the reads of a `let` or `const` after its declaration where another read may come before it, in the JavaScript minifier.
