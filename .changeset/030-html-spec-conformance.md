---
"webpack": patch
---

Follow the HTML spec more closely when parsing and printing: frameset content, quirks paragraphs and selects, `<![CDATA[` outside foreign content as a bogus comment, `<?target data?>` as a processing instruction, `</>` dropped, comment data and DOCTYPE identifiers read from the tokenizer states, attributes merged from a repeated `<html>`/`<body>` tag, legacy JavaScript script types, void `keygen` and font format detection — and hand back the tree a parsed document was built from when printing it.
