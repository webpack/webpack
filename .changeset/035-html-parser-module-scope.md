---
"webpack": patch
---

Speed up the HTML parser and cut its peak memory: module-scope helpers/state and tokenizer callbacks, exact AST column pre-sizing, one fewer AST node column by folding template content into the raw-text content-end slot, and a native run scan over comment bodies.
