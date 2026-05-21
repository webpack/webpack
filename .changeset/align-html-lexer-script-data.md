---
"webpack": patch
---

Align the experimental HTML tokenizer with the WHATWG spec: fix offset-range bugs in the script-data, content-mode end-tag, attribute-value, and EOF states; surface tokenizer parse errors to consumers via a new `parseError` callback (`"warning"` when the tokenizer recovers and the emitted token is still well-formed, `"error"` when the offset range is incomplete — e.g. `eof-in-tag`); and add the full WHATWG named character references table so `decodeHtmlEntities` handles all named entities (including legacy bare forms like `&AMP` and multi-code-point entities like `&NotEqualTilde;`) with proper longest-prefix backtracking.
