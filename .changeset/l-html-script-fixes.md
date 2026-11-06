---
"webpack": patch
---

Fix several HTML module outputs: a dropped `type="module"` no longer joins the tag name to the next attribute, an inlined `<script src>` drops its ignored body, a merged inline script is removed up to its real end tag, a `type` with NBSP is no longer read as JavaScript, a `nomodule` inline script keeps its own chunk, a page renamed by `realContentHash` keeps its CSP and inlined chunks, and a base64 `data:` URI in a charset other than UTF-8 is left untouched.
