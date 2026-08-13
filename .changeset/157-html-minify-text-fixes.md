---
"webpack": patch
---

Fix HTML minification losing a character after a CR line ending, dropping a body's leading whitespace when its tag is implied, keeping a shell tag over whitespace that prints nothing, omitting an end tag whose absence lets the parser's adoption agency restructure the tree, and the parser case-folding the non-ASCII characters of an element or attribute name.
