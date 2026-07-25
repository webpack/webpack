---
"webpack": patch
---

Speed up the HTML parser and cut its peak memory: module-scope helpers/state and tokenizer callbacks, exact AST column pre-sizing, one fewer AST node column by folding template content into the raw-text content-end slot, and native run scans over comment, bogus-comment, and plaintext bodies.
