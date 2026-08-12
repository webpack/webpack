---
"webpack": minor
---

Add `renderEmbeddedSource` to transform source one language embeds in another, as a compilation hook for CSS and HTML in JavaScript and as an HTML serializer option for an inline `<style>`, `style=""` and `<script>`, and fix a `style=""` reading the previous print's `output.environment`.
