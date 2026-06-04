---
"webpack": patch
---

Speed up CSS parsing by reusing one lexer token on the tokenizer hot path and trimming redundant char-code reads and lookups.
