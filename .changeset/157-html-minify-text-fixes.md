---
"webpack": patch
---

Fix HTML minification losing a character after a CR line ending, dropping a body's leading whitespace when its tag is implied, and the parser case-folding the non-ASCII characters of an element or attribute name.
