---
"webpack": patch
---

Align the experimental HTML tokenizer with the WHATWG spec: fix a handful of byte-range bugs in the script-data, content-mode end-tag, and attribute-value states, and add the full WHATWG named character references table so `decodeHtmlEntities` handles all named entities (including legacy bare forms like `&AMP` and multi-code-point entities like `&NotEqualTilde;`) with proper longest-prefix backtracking.
