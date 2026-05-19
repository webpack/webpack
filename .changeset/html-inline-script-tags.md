---
"webpack": minor
---

Add support for inline `<script>` tags in HTML modules. The tag's JS body is bundled as its own entry chunk — through the same pipeline that already processes `<script src>` — and the inline body is replaced with a `src` attribute pointing at the emitted chunk. Inline `<script type="module">` is bundled as an ESM entry; classic inline `<script>` is bundled as a CommonJS entry. `<script>` is treated as rawtext so a `<` inside the JS body (e.g. in a string literal) no longer breaks HTML parsing. Non-JS `type` values (e.g. `application/ld+json`, `importmap`) pass through unchanged.

The rewritten `<script>` tag's `type` attribute is reconciled with the emitted chunk's actual format, for both inline `<script>` and external `<script src>`: when `output.module` is on, classic scripts get `type="module"` auto-inserted so the ES-module chunk loads correctly; when `output.module` is off, `type="module"` is dropped so the classic IIFE chunk isn't loaded under module semantics.
