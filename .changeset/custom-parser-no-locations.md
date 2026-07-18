---
"webpack": minor
---

Support parsers without location support: locations now derive from node offsets via `JavascriptParser#getLocation` and AST nodes no longer carry `loc`.
