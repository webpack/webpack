---
"webpack": patch
---

Fix tokenizer edge cases: the CSS tokenizer read a `-` at the end of the input as part of the token before it (`1-` is a number and a delim, `@-` two delims); the JavaScript tokenizer read a regexp after `yield` in a generator as a division, accepted regexp syntax newer than the requested `ecmaVersion`, and reported the wrong `raisedAt` for an unterminated string, template or regexp.
