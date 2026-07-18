---
"webpack": minor
---

Support parsers without location or ASI APIs: locations and inserted semicolons now derive from node offsets and source text, and AST nodes no longer carry `loc`.
