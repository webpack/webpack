---
"webpack": patch
---

Align HTML lexer (`walkHtmlTokens`) with the WHATWG HTML spec and `swc_html_parser`:

- Drop the length cap on the script-data-double-escape-end temporary buffer (it could falsely match end tags like `</scripts>` against `"script"` and prematurely exit double-escaped mode).
- Update `tagStart` when entering the less-than sign state from script-data escaped states so the matching `</script>` close tag preserves the preceding script body in the emitted text span.
- Flush pending text when a content-mode close tag is detected via the attribute path (`</title foo>`, `</script bar=baz>`), not only via the direct `>` path.
- Track `commentStart` from the markup-declaration-open transition so EOF inside an incomplete `<!…` emits the correct comment byte range.
- Emit the missing-attribute-value form (`<a foo=>`) so the open-tag byte range still includes the `>`.
- Implement spec-correct named character reference matching by adding the full WHATWG named character references table (generated via `tooling/generate-html-entities.js`) and restoring the `STATE_AMBIGUOUS_AMPERSAND` fallthrough. `decodeHtmlEntities` now decodes the full table, including legacy bare entities (`&AMP`, `&copy`) and multi-code-point entities (`&NotEqualTilde;`), and applies WHATWG longest-prefix backtrack (`&notpre;` → `¬pre;`).
