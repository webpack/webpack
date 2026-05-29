---
"webpack": patch
---

Avoid redundant HTML module work: reuse the dependency-template render across the JS and HTML code-generation passes, and memoize sentinel resolution/content hashing per source.
