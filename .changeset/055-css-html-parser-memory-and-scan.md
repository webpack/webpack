---
"webpack": patch
---

Speed up and cut memory of the experimental CSS and HTML parsers: drop two derivable AST node columns, and scan long string, url, comment, and plaintext token bodies natively.
